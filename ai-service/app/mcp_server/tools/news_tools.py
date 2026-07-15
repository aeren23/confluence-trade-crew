"""
News Tools — get_pair_news, get_market_news, scrape_article.

Multi-source news with scoring (recency, impact, credibility, relevance).
See mcp_tools.md § 5 for full schema documentation.
"""

from __future__ import annotations

import html
import logging
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_HTTP_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; confluence-trade-bot/1.0)"}
_MAX_ARTICLE_CHARS = 4000
_SCRAPE_TIMEOUT_SECONDS = 15.0

# Source credibility weights (higher = more trusted)
_SOURCE_CREDIBILITY: dict[str, float] = {
    "coindesk": 0.95,
    "theblock": 0.90,
    "cointelegraph": 0.80,
    "decrypt": 0.75,
    "coingecko": 0.85,
    "cryptopanic": 0.85,
    "duckduckgo": 0.60,
}

# Impact keyword classification
_HIGH_IMPACT_KEYWORDS = (
    "sec", "regulation", "ban", "etf", "fed", "rate hike", "rate cut",
    "hack", "exploit", "bankruptcy", "lawsuit", "sanction", "approval",
)
_MEDIUM_IMPACT_KEYWORDS = (
    "partnership", "adoption", "institutional", "listing", "upgrade",
    "halving", "merge", "launch", "investment", "acquisition",
)
_LOW_IMPACT_KEYWORDS = (
    "opinion", "analysis", "predict", "could", "might", "rumor", "speculation",
)

_RSS_FEEDS = [
    ("coindesk", "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml"),
    ("cointelegraph", "https://cointelegraph.com/rss"),
    ("decrypt", "https://decrypt.co/feed"),
    ("theblock", "https://www.theblock.co/rss.xml"),
]

# Minimum relevance score for pair_news items — filters out unrelated stories
_RELEVANCE_THRESHOLD = 0.3

# Generic words that should not count toward relevance scoring
_GENERIC_WORDS = {"crypto", "cryptocurrency", "market", "news", "price", "coin", "token", "digital"}

_TICKER_MAP = {
    "btc": "bitcoin",
    "eth": "ethereum",
    "sol": "solana",
    "xrp": "ripple",
    "ada": "cardano",
    "dot": "polkadot",
    "avax": "avalanche",
    "link": "chainlink",
    "doge": "dogecoin",
}


# ── Scoring helpers ──────────────────────────────────────────────────────

def _parse_published_at(published_at: str) -> datetime | None:
    """Parse RSS/ISO date strings into UTC datetime."""
    if not published_at:
        return None
    try:
        if "T" in published_at:
            return datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        return parsedate_to_datetime(published_at).astimezone(timezone.utc)
    except (ValueError, TypeError, OverflowError):
        return None


def _score_recency(published_at: str) -> float:
    """Exponential decay: fresher news scores higher."""
    parsed = _parse_published_at(published_at)
    if parsed is None:
        return 0.5
    age_hours = (datetime.now(timezone.utc) - parsed).total_seconds() / 3600
    if age_hours < 1:
        return 1.0
    if age_hours < 6:
        return 0.8
    if age_hours < 24:
        return 0.5
    if age_hours < 72:
        return 0.3
    return 0.2


def _score_impact(title: str, snippet: str = "") -> tuple[float, str]:
    """Classify impact level from headline keywords."""
    text = f"{title} {snippet}".lower()
    if any(kw in text for kw in _HIGH_IMPACT_KEYWORDS):
        return 1.0, "high"
    if any(kw in text for kw in _MEDIUM_IMPACT_KEYWORDS):
        return 0.6, "medium"
    if any(kw in text for kw in _LOW_IMPACT_KEYWORDS):
        return 0.3, "low"
    return 0.5, "medium"


def _score_credibility(source: str) -> float:
    """Return credibility weight for a news source."""
    return _SOURCE_CREDIBILITY.get(source.lower(), 0.5)


def _score_relevance(text: str, keywords: set[str]) -> float:
    """Keyword density relevance score."""
    if not keywords:
        return 0.5
    lower_text = text.lower()
    matches = sum(1 for kw in keywords if kw in lower_text)
    return min(1.0, matches / max(len(keywords), 1))


def _build_topic_keywords(topic: str) -> set[str]:
    """Expand topic/ticker into keyword set for relevance filtering.

    Generic filler words (crypto, market, news, etc.) are excluded so they
    don't inflate relevance scores for unrelated stories.
    """
    raw_words = topic.replace("/", " ").replace("-", " ").split()
    keywords = {w.lower() for w in raw_words if len(w) >= 2 and w.lower() not in _GENERIC_WORDS}
    for kw in list(keywords):
        if kw in _TICKER_MAP:
            keywords.add(_TICKER_MAP[kw])
    return keywords


def _calculate_news_score(item: dict, keywords: set[str] | None = None) -> dict:
    """
    Multi-factor news scoring: recency, impact, credibility, relevance.

    Returns scoring metadata attached to the news item.
    """
    title = item.get("title", "")
    snippet = item.get("snippet", "")
    source = item.get("source", "unknown")
    published_at = item.get("published_at", "")

    recency = _score_recency(published_at)
    impact_val, impact_level = _score_impact(title, snippet)
    credibility = _score_credibility(source)
    relevance = _score_relevance(f"{title} {snippet}", keywords or set())

    composite = (recency * 0.25) + (impact_val * 0.35) + (credibility * 0.20) + (relevance * 0.20)
    composite = round(min(1.0, max(0.0, composite)), 3)

    # Directional hint from keywords (Faz 4 enhancement)
    text_lower = f"{title} {snippet}".lower()
    
    bullish_patterns = [
        r"panic.*ending", r"selling.*over", r"recovery", r"rebound", 
        r"adoption", r"etf approved", r"institutional buying", 
        r"surge", r"rally", r"rise", r"bull", r"approval", r"record", r"gain"
    ]
    bearish_patterns = [
        r"hostilities", r"war", r"crash", r"hack", r"sec.*sue", 
        r"ban", r"liquidation", r"sends.*lower", r"drop", r"fall", 
        r"bear", r"sell", r"decline", r"loss"
    ]
    
    bearish_hits = sum(1 for p in bearish_patterns if re.search(p, text_lower))
    bullish_hits = sum(1 for p in bullish_patterns if re.search(p, text_lower))
    
    if bullish_hits > bearish_hits:
        directional_hint = "bullish"
    elif bearish_hits > bullish_hits:
        directional_hint = "bearish"
    else:
        directional_hint = "neutral"

    return {
        "composite_score": composite,
        "recency_score": round(recency, 3),
        "impact_level": impact_level,
        "impact_score": round(impact_val, 3),
        "credibility_score": round(credibility, 3),
        "relevance_score": round(relevance, 3),
        "directional_hint": directional_hint,
    }


def _enrich_items_with_scores(items: list[dict], keywords: set[str] | None = None) -> list[dict]:
    """Attach scoring metadata to each news item and sort by composite score."""
    for item in items:
        item["scoring"] = _calculate_news_score(item, keywords)
    return sorted(items, key=lambda x: x["scoring"]["composite_score"], reverse=True)


# ── Article scraping ───────────────────────────────────────────────────

def _extract_text_from_html(html_content: str) -> str:
    """Strip HTML tags and decode entities to readable plain text."""
    text = re.sub(r"<script[^>]*>.*?</script>", " ", html_content, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:_MAX_ARTICLE_CHARS]


async def scrape_article(url: str, max_chars: int = _MAX_ARTICLE_CHARS) -> dict:
    """
    Fetch and extract readable text content from a news article URL.

    Args:
        url: Full article URL to scrape.
        max_chars: Maximum characters to return (default 4000).

    Returns:
        Dict with url, title, content excerpt, word_count, and success flag.
    """
    if not url or not url.startswith("http"):
        return {"isError": True, "content": "Invalid URL provided"}

    try:
        async with httpx.AsyncClient(
            timeout=_SCRAPE_TIMEOUT_SECONDS,
            headers=_HTTP_HEADERS,
            follow_redirects=True,
        ) as client:
            response = await client.get(url)
            response.raise_for_status()

        content_type = response.headers.get("content-type", "")
        if "html" not in content_type.lower() and "<html" not in response.text[:500].lower():
            return {
                "url": url,
                "success": False,
                "reason": f"Non-HTML content type: {content_type}",
            }

        raw_html = response.text
        title_match = re.search(r"<title[^>]*>(.*?)</title>", raw_html, re.IGNORECASE | re.DOTALL)
        title = html.unescape(title_match.group(1).strip()) if title_match else ""
        content = _extract_text_from_html(raw_html)[:max_chars]

        if len(content) < 100:
            return {
                "url": url,
                "success": False,
                "reason": "Extracted content too short — page may require JavaScript",
            }

        return {
            "url": url,
            "title": title,
            "content": content,
            "word_count": len(content.split()),
            "success": True,
        }
    except httpx.HTTPError as exc:
        logger.warning("scrape_article failed for %s: %s", url, exc)
        return {"isError": True, "content": f"Failed to fetch article: {type(exc).__name__}"}


# ── RSS / external fetchers ──────────────────────────────────────────────

def _parse_rss(xml_text: str, source: str, max_results: int) -> list[dict]:
    """Parse RSS XML and return a list of news items."""
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.warning("RSS parse error for %s: %s", source, exc)
        return []

    items = []
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


async def _fetch_coingecko_news(max_results: int = 5) -> list[dict]:
    """Fetch trending crypto news from CoinGecko public API."""
    url = "https://api.coingecko.com/api/v3/news"
    try:
        async with httpx.AsyncClient(timeout=15.0, headers=_HTTP_HEADERS) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

        items = []
        articles = data if isinstance(data, list) else data.get("data", data.get("news", []))
        for article in articles[:max_results]:
            if isinstance(article, dict):
                items.append({
                    "title": article.get("title", ""),
                    "snippet": (article.get("description") or article.get("summary") or "")[:200],
                    "url": article.get("url", article.get("link", "")),
                    "published_at": article.get("published_at", article.get("updated_at", "")),
                    "source": "coingecko",
                })
        return items
    except (httpx.HTTPError, KeyError, TypeError) as exc:
        logger.warning("CoinGecko news fetch failed: %s", exc)
        return []


async def _fetch_rss_news(topic: str, max_results: int) -> list[dict]:
    """
    Fetch keyword-filtered articles from RSS feeds.
    Returns empty list when no relevant matches — no generic fallback.
    """
    topic_keywords = _build_topic_keywords(topic)

    async with httpx.AsyncClient(
        timeout=15.0,
        headers=_HTTP_HEADERS,
        follow_redirects=True,
    ) as client:
        for source_name, feed_url in _RSS_FEEDS:
            try:
                response = await client.get(feed_url)
                response.raise_for_status()
                all_items = _parse_rss(response.text, source_name, max_results * 5)

                filtered = [
                    item for item in all_items
                    if any(
                        kw in (item["title"] + item.get("snippet", "")).lower()
                        for kw in topic_keywords
                    )
                ]

                if filtered:
                    return filtered[:max_results]

            except (httpx.HTTPError, Exception) as exc:
                logger.warning("RSS fetch from %s failed: %s", source_name, exc)
                continue

    logger.info("RSS: no keyword-relevant articles found for '%s'", topic)
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


# ── get_pair_news ────────────────────────────────────────────────────────

async def get_pair_news(
    base_asset: str,
    limit: int = 10,
) -> dict:
    """
    Fetch pair-specific news from CryptoPanic, CoinGecko, RSS, and DDG.
    Items are scored and sorted by composite relevance.
    """
    items: list[dict] = []
    sentiment_scores: list[float] = []
    source_notes: list[str] = []
    keywords = _build_topic_keywords(base_asset)

    # 1. CryptoPanic (premium)
    if settings.cryptopanic_api_key:
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

            cp_count = 0
            for post in data.get("results", [])[:limit]:
                votes = post.get("votes", {})
                positive = votes.get("positive", 0)
                negative = votes.get("negative", 0)

                if "bullish" in str(post.get("metadata", {})):
                    panic_sentiment, score = "bullish", 1.0
                elif "bearish" in str(post.get("metadata", {})):
                    panic_sentiment, score = "bearish", -1.0
                else:
                    panic_sentiment, score = "neutral", 0.0

                weight = max(1, positive - negative)
                sentiment_scores.append(score * weight)

                items.append({
                    "title": post.get("title", ""),
                    "published_at": post.get("published_at", ""),
                    "url": post.get("url", ""),
                    "snippet": "",
                    "votes": {"positive": positive, "negative": negative},
                    "panic_sentiment": panic_sentiment,
                    "source": "cryptopanic",
                })
                cp_count += 1
            source_notes.append(f"CryptoPanic: {cp_count} items")
        except httpx.HTTPError as exc:
            source_notes.append(f"CryptoPanic failed: {type(exc).__name__}")
    else:
        source_notes.append("CryptoPanic API key missing (skipped)")

    # 2. CoinGecko news
    cg_items = await _fetch_coingecko_news(max_results=max(3, limit // 2))
    if cg_items:
        cg_filtered = [
            item for item in cg_items
            if any(kw in (item["title"] + item.get("snippet", "")).lower() for kw in keywords)
        ] or cg_items
        items.extend(cg_filtered[:max(3, limit - len(items))])
        source_notes.append(f"CoinGecko: {len(cg_filtered[:3])} items")

    # 3. RSS / DDG fallback
    market_limit = max(3, limit - len(items))
    market_res = await get_market_news(f"{base_asset} crypto news", max_results=market_limit)
    market_items = market_res.get("items", [])

    if market_items:
        for m_item in market_items:
            if not any(existing.get("url") == m_item.get("url") for existing in items if m_item.get("url")):
                items.append(m_item)
        source_notes.append(f"{market_res.get('source')}: {len(market_items)} items")
    else:
        source_notes.append("RSS/DDG returned no items")

    # Score and sort all items, then apply relevance threshold
    items = _enrich_items_with_scores(items[:limit], keywords)
    # Keep CryptoPanic items regardless (they are already asset-specific by API query),
    # but filter out non-CryptoPanic items that score below relevance threshold.
    items = [
        item for item in items
        if item.get("source") == "cryptopanic"
        or item["scoring"]["relevance_score"] >= _RELEVANCE_THRESHOLD
    ]

    total_weight = sum(abs(s) for s in sentiment_scores) or 1
    aggregate = sum(sentiment_scores) / total_weight if sentiment_scores else 0.0
    aggregate = max(-1.0, min(1.0, aggregate))

    return {
        "source": "unified -> " + "; ".join(source_notes),
        "base_asset": base_asset,
        "items": items,
        "aggregate_sentiment_score": round(aggregate, 3),
        "item_count": len(items),
    }


# ── get_market_news ──────────────────────────────────────────────────────

async def get_market_news(
    topic: str,
    max_results: int = 5,
) -> dict:
    """
    Fetch macro crypto news via RSS, CoinGecko, and DuckDuckGo fallback.
    Items include multi-factor scoring metadata.
    """
    keywords = _build_topic_keywords(topic)
    items = await _fetch_rss_news(topic, max_results)

    if not items:
        cg_items = await _fetch_coingecko_news(max_results=max_results)
        items = [
            item for item in cg_items
            if any(kw in (item["title"] + item.get("snippet", "")).lower() for kw in keywords)
        ] or cg_items[:max_results]

    if not items:
        logger.info("RSS/CoinGecko returned no results, falling back to DuckDuckGo")
        items = await _fetch_ddg_news(topic, max_results)

    if not items:
        logger.warning("get_market_news: all sources exhausted, returning empty")
        return {
            "source": "web_search",
            "topic": topic,
            "items": [],
            "reason": "All news sources exhausted (RSS + CoinGecko + DuckDuckGo).",
        }

    items = _enrich_items_with_scores(items, keywords)

    return {
        "source": "rss",
        "topic": topic,
        "items": items,
        "item_count": len(items),
    }
