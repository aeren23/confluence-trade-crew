"""
News Tools — get_pair_news, get_market_news.

get_pair_news: CryptoPanic API for pair-specific crypto news.
get_market_news: Multi-source news fetcher with cascading fallbacks:
    1. CoinGecko news endpoint (no API key required, free public endpoint)
    2. RSS feeds from CoinDesk and CoinTelegraph via httpx + basic XML parse
    3. DuckDuckGo text search as last resort

See mcp_tools.md § 5 for full schema documentation.
"""

import httpx
import logging
import xml.etree.ElementTree as ET

from app.config import settings

logger = logging.getLogger(__name__)


# ── get_pair_news ────────────────────────────────────────────────────────

async def get_pair_news(
    base_asset: str,
    limit: int = 10,
) -> dict:
    """
    Fetch pair-specific news from CryptoPanic.

    Args:
        base_asset: Coin symbol, e.g. "BTC".
        limit: Max number of news items (default 10).

    Returns:
        Dict with source, items, and aggregate_sentiment_score.
        Returns source="unavailable" if API key is not configured.
    """
    if not settings.cryptopanic_api_key:
        return {
            "source": "unavailable",
            "base_asset": base_asset,
            "items": [],
            "aggregate_sentiment_score": 0.0,
            "reason": "CRYPTOPANIC_API_KEY not configured",
        }

    url = "https://cryptopanic.com/api/v1/posts/"
    params = {
        "auth_token": settings.cryptopanic_api_key,
        "currencies": base_asset,
        "kind": "news",
        "public": "true",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 401:
            return {
                "source": "unavailable",
                "base_asset": base_asset,
                "items": [],
                "aggregate_sentiment_score": 0.0,
                "reason": "CryptoPanic authentication failed",
            }
        return {
            "source": "unavailable",
            "base_asset": base_asset,
            "items": [],
            "aggregate_sentiment_score": 0.0,
            "reason": f"CryptoPanic API error: {exc.response.status_code}",
        }
    except httpx.HTTPError as exc:
        return {
            "source": "unavailable",
            "base_asset": base_asset,
            "items": [],
            "aggregate_sentiment_score": 0.0,
            "reason": f"Request error: {type(exc).__name__}",
        }

    # Parse results
    results = data.get("results", [])[:limit]
    items = []
    sentiment_scores = []

    for post in results:
        votes = post.get("votes", {})
        positive = votes.get("positive", 0)
        negative = votes.get("negative", 0)

        if "bullish" in str(post.get("metadata", {})):
            panic_sentiment = "bullish"
            score = 1.0
        elif "bearish" in str(post.get("metadata", {})):
            panic_sentiment = "bearish"
            score = -1.0
        else:
            panic_sentiment = "neutral"
            score = 0.0

        weight = max(1, positive - negative)
        sentiment_scores.append(score * weight)

        items.append({
            "title": post.get("title", ""),
            "published_at": post.get("published_at", ""),
            "url": post.get("url", ""),
            "votes": {"positive": positive, "negative": negative},
            "panic_sentiment": panic_sentiment,
        })

    total_weight = sum(abs(s) for s in sentiment_scores) or 1
    aggregate = sum(sentiment_scores) / total_weight if sentiment_scores else 0.0
    aggregate = max(-1.0, min(1.0, aggregate))

    return {
        "source": "cryptopanic",
        "base_asset": base_asset,
        "items": items,
        "aggregate_sentiment_score": round(aggregate, 3),
    }


# ── get_market_news helpers ──────────────────────────────────────────────

_RSS_FEEDS = [
    ("coindesk",      "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml"),
    ("cointelegraph", "https://cointelegraph.com/rss"),
    ("decrypt",       "https://decrypt.co/feed"),
]


def _parse_rss(xml_text: str, source: str, max_results: int) -> list[dict]:
    """Parse RSS XML and return a list of news items."""
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.warning("RSS parse error for %s: %s", source, exc)
        return []

    items = []
    # RSS items are in channel/item
    for item in root.iter("item"):
        if len(items) >= max_results:
            break
        title = item.findtext("title", "").strip()
        link = item.findtext("link", "").strip()
        pub_date = item.findtext("pubDate", "").strip()
        description = item.findtext("description", "").strip()
        if title:
            items.append({
                "title": title,
                "snippet": description[:200] if description else "",
                "url": link,
                "published_at": pub_date,
                "source": source,
            })
    return items


async def _fetch_rss_news(topic: str, max_results: int) -> list[dict]:
    """
    Try each RSS feed in order, return results from the first that succeeds.
    Filters articles whose title contains any word from the topic query.
    """
    topic_keywords = {w.lower() for w in topic.split() if len(w) > 3}

    async with httpx.AsyncClient(
        timeout=15.0,
        headers={"User-Agent": "Mozilla/5.0 (compatible; confluence-trade-bot/1.0)"},
        follow_redirects=True,
    ) as client:
        for source_name, feed_url in _RSS_FEEDS:
            try:
                response = await client.get(feed_url)
                response.raise_for_status()
                all_items = _parse_rss(response.text, source_name, max_results * 3)

                # Filter by keyword relevance (best effort)
                filtered = [
                    item for item in all_items
                    if any(kw in item["title"].lower() for kw in topic_keywords)
                ] or all_items  # Fallback: return all items if nothing matches

                result = filtered[:max_results]
                if result:
                    logger.debug("RSS fetch from %s returned %d items", source_name, len(result))
                    return result

            except (httpx.HTTPError, Exception) as exc:
                logger.warning("RSS fetch from %s failed: %s", source_name, exc)
                continue

    return []


async def _fetch_ddg_news(topic: str, max_results: int) -> list[dict]:
    """DuckDuckGo text search as last-resort fallback."""
    try:
        from duckduckgo_search import DDGS

        crypto_news_sites = (
            "site:coindesk.com OR site:cointelegraph.com OR "
            "site:decrypt.co OR site:theblock.co"
        )
        search_query = f"{topic} ({crypto_news_sites})"

        with DDGS() as ddgs:
            raw_results = list(ddgs.text(search_query, max_results=max_results))

        return [
            {
                "title": r.get("title", ""),
                "snippet": r.get("body", ""),
                "url": r.get("href", r.get("url", "")),
                "published_at": r.get("published", ""),
                "source": "duckduckgo",
            }
            for r in raw_results
        ]
    except Exception as exc:
        logger.warning("DuckDuckGo fallback failed: %s: %s", type(exc).__name__, exc)
        return []


# ── get_market_news ──────────────────────────────────────────────────────

async def get_market_news(
    topic: str,
    max_results: int = 5,
) -> dict:
    """
    Fetch general crypto market news via multi-source cascading fallback.

    Fetch order:
    1. RSS feeds (CoinDesk, CoinTelegraph, Decrypt) — no rate limits, no auth
    2. DuckDuckGo text search — fallback if all RSS feeds fail

    Args:
        topic: Search/filter query, e.g. "Bitcoin regulation", "Fed rate crypto".
        max_results: Maximum results to return (default 5).

    Returns:
        Dict with source, topic, items list, and optional reason if empty.
    """
    # 1. Try RSS feeds first (most reliable, no rate limits)
    items = await _fetch_rss_news(topic, max_results)

    if not items:
        logger.info("RSS feeds returned no results, falling back to DuckDuckGo")
        items = await _fetch_ddg_news(topic, max_results)

    if not items:
        logger.warning("get_market_news: all sources exhausted, returning empty")
        return {
            "source": "web_search",
            "topic": topic,
            "items": [],
            "reason": "All news sources exhausted (RSS + DuckDuckGo). IP may be rate-limited.",
        }

    return {
        "source": "rss",
        "topic": topic,
        "items": items,
    }
