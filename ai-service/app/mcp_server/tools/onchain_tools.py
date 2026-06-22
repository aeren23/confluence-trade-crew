"""
On-Chain & Derivatives Tools — Binance Futures Public API.

Fetches funding rates, open interest, and long/short ratios from
Binance Futures public endpoints (no API key required).

All endpoints use the Futures base URL: https://fapi.binance.com
or the Futures data URL: https://www.binance.com/futures/data

These tools provide market microstructure signals to the On-Chain Agent:
- Extreme funding rates → crowded positions risk
- OI changes vs price divergence → potential reversals
- Long/short ratios → sentiment extremes (contrarian signal)

See mcp_tools.md § 6 for full schema documentation.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

_FUTURES_BASE = "https://fapi.binance.com"
_FUTURES_DATA = "https://www.binance.com/futures/data"
_HTTP_TIMEOUT = 12.0
_HTTP_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; confluence-trade-bot/1.0)"}

# Funding rate thresholds for sentiment classification
_FUNDING_EXTREME_POSITIVE = 0.0005   # +0.05% — extreme greed (longs pay shorts)
_FUNDING_HIGH_POSITIVE    = 0.0002   # +0.02% — greed
_FUNDING_EXTREME_NEGATIVE = -0.0005  # -0.05% — extreme fear (shorts pay longs)
_FUNDING_HIGH_NEGATIVE    = -0.0002  # -0.02% — fear


def _symbol_to_futures(symbol: str) -> str:
    """Convert 'BTC/USDT' format to Binance Futures format 'BTCUSDT'."""
    return symbol.replace("/", "").upper()


def _classify_funding_sentiment(rate: float) -> str:
    """Classify funding rate into sentiment label."""
    if rate >= _FUNDING_EXTREME_POSITIVE:
        return "extreme_greed"
    if rate >= _FUNDING_HIGH_POSITIVE:
        return "greed"
    if rate <= _FUNDING_EXTREME_NEGATIVE:
        return "extreme_fear"
    if rate <= _FUNDING_HIGH_NEGATIVE:
        return "fear"
    return "neutral"


async def get_funding_rate(symbol: str, limit: int = 8) -> dict:
    """
    Fetch current and recent funding rates from Binance Futures.

    Positive rates mean longs pay shorts (overbought, bearish contrarian signal).
    Negative rates mean shorts pay longs (oversold, bullish contrarian signal).
    Extreme funding (>0.05% or <-0.05%) is a strong contrarian indicator.

    Args:
        symbol: Trading pair in 'BTC/USDT' format.
        limit: Number of historical funding periods to return (default 8 = last 24h for 3h intervals).

    Returns:
        Dict with current_rate, historical_rates, sentiment, and interpretation.
    """
    futures_symbol = _symbol_to_futures(symbol)
    url = f"{_FUTURES_BASE}/fapi/v1/fundingRate"

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT, headers=_HTTP_HEADERS) as client:
            response = await client.get(
                url,
                params={"symbol": futures_symbol, "limit": min(limit, 100)},
            )
            response.raise_for_status()
            data = response.json()

    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 400:
            # Symbol not found on Futures (may be spot-only)
            return {
                "isError": False,
                "symbol": symbol,
                "available": False,
                "reason": f"{symbol} does not have a Binance Futures contract. Funding data unavailable.",
            }
        return {"isError": True, "content": f"Futures API error: {exc}"}
    except httpx.HTTPError as exc:
        return {"isError": True, "content": f"Network error fetching funding rate: {type(exc).__name__}"}

    if not data:
        return {
            "isError": False,
            "symbol": symbol,
            "available": False,
            "reason": "No funding rate data returned.",
        }

    # Parse historical rates
    historical = []
    for entry in data:
        rate = float(entry.get("fundingRate", 0))
        ts = int(entry.get("fundingTime", 0))
        historical.append({
            "rate": round(rate, 6),
            "rate_pct": round(rate * 100, 4),
            "timestamp": datetime.fromtimestamp(ts / 1000, tz=timezone.utc).isoformat(),
            "sentiment": _classify_funding_sentiment(rate),
        })

    current_rate = historical[-1]["rate"] if historical else 0.0
    sentiment = _classify_funding_sentiment(current_rate)

    # Build human-readable interpretation
    if current_rate > 0:
        direction = "longs are paying shorts"
        market_bias = "market is biased LONG — potential squeeze if crowd is too long"
    elif current_rate < 0:
        direction = "shorts are paying longs"
        market_bias = "market is biased SHORT — potential squeeze if crowd is too short"
    else:
        direction = "funding is balanced"
        market_bias = "no clear directional bias from funding"

    interpretation = (
        f"Current funding rate is {current_rate * 100:.4f}% ({direction}). "
        f"Sentiment: {sentiment.upper()}. "
        f"{market_bias}."
    )

    return {
        "symbol": symbol,
        "futures_symbol": futures_symbol,
        "available": True,
        "current_rate": current_rate,
        "current_rate_pct": round(current_rate * 100, 4),
        "sentiment": sentiment,
        "interpretation": interpretation,
        "historical_rates": historical,
        "contrarian_signal": "bullish" if sentiment in ("extreme_fear", "fear") else
                             "bearish" if sentiment in ("extreme_greed", "greed") else "neutral",
    }


async def get_open_interest(symbol: str) -> dict:
    """
    Fetch current open interest and recent OI history from Binance Futures.

    Open Interest (OI) = total number of outstanding contracts.
    Rising OI + rising price = healthy trend continuation.
    Falling OI + rising price = weakening trend (short covering, not new buying).
    Divergence between OI and price direction is a key warning signal.

    Args:
        symbol: Trading pair in 'BTC/USDT' format.

    Returns:
        Dict with current_oi, oi_change_pct, oi_trend, price_oi_divergence, and interpretation.
    """
    futures_symbol = _symbol_to_futures(symbol)
    oi_url = f"{_FUTURES_BASE}/fapi/v1/openInterest"
    oi_hist_url = f"{_FUTURES_BASE}/futures/data/openInterestHist"

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT, headers=_HTTP_HEADERS) as client:
            # Current OI
            oi_resp = await client.get(oi_url, params={"symbol": futures_symbol})
            oi_resp.raise_for_status()
            current_data = oi_resp.json()

            # Historical OI (last 5 periods at 1h interval)
            hist_resp = await client.get(
                oi_hist_url,
                params={"symbol": futures_symbol, "period": "1h", "limit": 5},
            )
            hist_data = hist_resp.json() if hist_resp.status_code == 200 else []

    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 400:
            return {
                "isError": False,
                "symbol": symbol,
                "available": False,
                "reason": f"{symbol} does not have a Binance Futures contract.",
            }
        return {"isError": True, "content": f"OI API error: {exc}"}
    except httpx.HTTPError as exc:
        return {"isError": True, "content": f"Network error fetching open interest: {type(exc).__name__}"}

    current_oi = float(current_data.get("openInterest", 0))

    # Calculate OI change from historical data
    oi_change_pct = 0.0
    oi_trend = "flat"

    if isinstance(hist_data, list) and len(hist_data) >= 2:
        oldest_oi = float(hist_data[0].get("sumOpenInterest", 0))
        latest_oi = float(hist_data[-1].get("sumOpenInterest", current_oi))
        if oldest_oi > 0:
            oi_change_pct = round(((latest_oi - oldest_oi) / oldest_oi) * 100, 2)
            if oi_change_pct > 2.0:
                oi_trend = "increasing"
            elif oi_change_pct < -2.0:
                oi_trend = "decreasing"

    # Format historical
    oi_history = []
    if isinstance(hist_data, list):
        for item in hist_data:
            ts = int(item.get("timestamp", 0))
            oi_history.append({
                "open_interest": float(item.get("sumOpenInterest", 0)),
                "timestamp": datetime.fromtimestamp(ts / 1000, tz=timezone.utc).isoformat()
                             if ts else "unknown",
            })

    interpretation = (
        f"Open interest is {current_oi:,.0f} contracts, "
        f"{'up' if oi_change_pct >= 0 else 'down'} {abs(oi_change_pct):.1f}%% in last 5h. "
        f"OI trend: {oi_trend.upper()}. "
    )
    if oi_trend == "increasing":
        interpretation += "New money entering market — trend likely to continue."
    elif oi_trend == "decreasing":
        interpretation += "Positions being closed — possible trend exhaustion or reversal."
    else:
        interpretation += "OI is stable — no significant new positioning."

    return {
        "symbol": symbol,
        "available": True,
        "current_oi": current_oi,
        "oi_change_pct": oi_change_pct,
        "oi_trend": oi_trend,
        "interpretation": interpretation,
        "oi_history": oi_history,
    }


async def get_long_short_ratio(symbol: str, period: str = "1h") -> dict:
    """
    Fetch global and top-trader long/short account ratios from Binance Futures.

    Ratios > 1.0 mean more accounts (or top traders) are long.
    Ratios < 1.0 mean more accounts (or top traders) are short.

    Extremes are contrarian signals: when 80%+ of retail is long, the market
    often moves the other way (liquidity hunting / stop sweep).

    Args:
        symbol: Trading pair in 'BTC/USDT' format.
        period: Data interval — "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "6h" | "12h" | "1d".

    Returns:
        Dict with global_ls_ratio, top_trader_ls_ratio, retail_sentiment, contrarian_signal.
    """
    futures_symbol = _symbol_to_futures(symbol)
    global_url = f"{_FUTURES_BASE}/futures/data/globalLongShortAccountRatio"
    top_url = f"{_FUTURES_BASE}/futures/data/topLongShortPositionRatio"

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT, headers=_HTTP_HEADERS) as client:
            params = {"symbol": futures_symbol, "period": period, "limit": 1}

            global_resp = await client.get(global_url, params=params)
            top_resp = await client.get(top_url, params=params)

        global_data = global_resp.json() if global_resp.status_code == 200 else []
        top_data = top_resp.json() if top_resp.status_code == 200 else []

    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 400:
            return {
                "isError": False,
                "symbol": symbol,
                "available": False,
                "reason": f"{symbol} does not have a Binance Futures contract.",
            }
        return {"isError": True, "content": f"L/S ratio API error: {exc}"}
    except httpx.HTTPError as exc:
        return {"isError": True, "content": f"Network error fetching long/short ratio: {type(exc).__name__}"}

    # Parse global ratio
    global_ratio = None
    global_long_pct = None
    if isinstance(global_data, list) and global_data:
        item = global_data[-1]
        global_ratio = float(item.get("longShortRatio", 1.0))
        global_long_pct = float(item.get("longAccount", 0.5)) * 100

    # Parse top trader ratio
    top_ratio = None
    if isinstance(top_data, list) and top_data:
        item = top_data[-1]
        top_ratio = float(item.get("longShortRatio", 1.0))

    # Classify retail sentiment
    retail_sentiment = "balanced"
    contrarian_signal = "neutral"
    if global_long_pct is not None:
        if global_long_pct >= 70:
            retail_sentiment = "overleveraged_long"
            contrarian_signal = "bearish"  # Crowd too long → possible short squeeze
        elif global_long_pct <= 30:
            retail_sentiment = "overleveraged_short"
            contrarian_signal = "bullish"  # Crowd too short → possible long squeeze
        elif global_long_pct >= 60:
            retail_sentiment = "leaning_long"
            contrarian_signal = "mildly_bearish"
        elif global_long_pct <= 40:
            retail_sentiment = "leaning_short"
            contrarian_signal = "mildly_bullish"

    interpretation = ""
    if global_long_pct is not None:
        interpretation = (
            f"{global_long_pct:.1f}%% of accounts are long (ratio: {global_ratio:.2f}). "
            f"Retail sentiment: {retail_sentiment.upper()}. "
        )
        if top_ratio is not None:
            interpretation += f"Top traders L/S: {top_ratio:.2f}. "
        if contrarian_signal in ("bearish", "bullish"):
            interpretation += (
                f"WARNING: Extreme positioning — contrarian {contrarian_signal.upper()} signal. "
                "Market often moves against the crowd at extremes."
            )

    return {
        "symbol": symbol,
        "available": global_ratio is not None,
        "global_ls_ratio": global_ratio,
        "global_long_pct": global_long_pct,
        "top_trader_ls_ratio": top_ratio,
        "retail_sentiment": retail_sentiment,
        "contrarian_signal": contrarian_signal,
        "interpretation": interpretation,
    }


async def get_derivatives_summary(symbol: str) -> dict:
    """
    Aggregate all derivatives data into a single composite on-chain signal.

    Combines funding rate, open interest, and long/short ratios into
    a composite sentiment score from -1.0 (strong bearish) to +1.0 (strong bullish).

    This is the primary tool the On-Chain Agent should call for a comprehensive overview.
    The individual tools (get_funding_rate, get_open_interest, get_long_short_ratio)
    are available for deeper drill-down.

    Args:
        symbol: Trading pair in 'BTC/USDT' format.

    Returns:
        Dict with composite_score, composite_sentiment, confidence, breakdown, and warnings.
    """
    # Run all three data fetches
    funding = await get_funding_rate(symbol)
    oi = await get_open_interest(symbol)
    ls = await get_long_short_ratio(symbol)

    warnings: list[str] = []
    scores: list[tuple[float, float]] = []  # (score, weight)

    # ── Funding Rate Score ──────────────────────────────────────────────────
    funding_score = 0.0
    funding_available = funding.get("available", False) and not funding.get("isError")
    if funding_available:
        contrarian = funding.get("contrarian_signal", "neutral")
        # Contrarian: bearish funding → bullish signal (longs will get squeezed)
        if contrarian == "bullish":
            funding_score = 0.6
        elif contrarian == "bearish":
            funding_score = -0.6
        
        # Scale by extremity
        sentiment_label = funding.get("sentiment", "neutral")
        if "extreme" in sentiment_label:
            funding_score *= 1.5  # cap at ±0.9 effectively
            rate_pct = abs(funding.get("current_rate_pct", 0))
            warnings.append(
                f"⚠️ EXTREME FUNDING RATE: {funding.get('current_rate_pct', 0):+.4f}%% — "
                f"{'longs overcrowded' if funding_score < 0 else 'shorts overcrowded'}, "
                f"squeeze risk is HIGH."
            )
        funding_score = max(-1.0, min(1.0, funding_score))
        scores.append((funding_score, 0.40))

    # ── Long/Short Ratio Score ──────────────────────────────────────────────
    ls_score = 0.0
    ls_available = ls.get("available", False) and not ls.get("isError")
    if ls_available:
        contrarian = ls.get("contrarian_signal", "neutral")
        if contrarian == "bullish":
            ls_score = 0.5
        elif contrarian == "bearish":
            ls_score = -0.5
        elif contrarian == "mildly_bullish":
            ls_score = 0.25
        elif contrarian == "mildly_bearish":
            ls_score = -0.25

        retail_sentiment = ls.get("retail_sentiment", "balanced")
        if retail_sentiment in ("overleveraged_long", "overleveraged_short"):
            long_pct = ls.get("global_long_pct", 50)
            warnings.append(
                f"⚠️ CROWD POSITIONING EXTREME: {long_pct:.1f}%% long — "
                f"{'shorts may squeeze longs' if ls_score < 0 else 'longs may squeeze shorts'}."
            )
        scores.append((ls_score, 0.35))

    # ── Open Interest Score ─────────────────────────────────────────────────
    oi_score = 0.0
    oi_available = oi.get("available", False) and not oi.get("isError")
    if oi_available:
        oi_trend = oi.get("oi_trend", "flat")
        # Rising OI is directionally ambiguous alone; its value is context-dependent.
        # We use it as a confidence modifier, not a directional signal.
        # Decreasing OI = less conviction = lower confidence in other signals.
        if oi_trend == "decreasing":
            oi_score = 0.0  # no direction, but flags exhaustion
            oi_change = oi.get("oi_change_pct", 0)
            if abs(oi_change) > 5:
                warnings.append(
                    f"⚠️ SHARP OI DROP: {oi_change:.1f}%% in last 5h — "
                    "possible liquidation cascade or trend exhaustion."
                )
        scores.append((oi_score, 0.25))

    # ── Composite Score ─────────────────────────────────────────────────────
    composite_score = 0.0
    confidence = 0.30  # low base confidence when no data

    if scores:
        total_weight = sum(w for _, w in scores)
        composite_score = sum(s * w for s, w in scores) / total_weight if total_weight > 0 else 0.0
        composite_score = round(max(-1.0, min(1.0, composite_score)), 4)
        # Confidence scales with how many data sources were available
        confidence = round(len(scores) / 3 * 0.70 + 0.10, 2)

    # Sentiment label
    if composite_score > 0.2:
        composite_sentiment = "bullish"
    elif composite_score < -0.2:
        composite_sentiment = "bearish"
    else:
        composite_sentiment = "neutral"

    return {
        "symbol": symbol,
        "composite_score": composite_score,
        "composite_sentiment": composite_sentiment,
        "confidence": confidence,
        "warnings": warnings,
        "breakdown": {
            "funding_rate": {
                "available": funding_available,
                "score": funding_score,
                "current_rate_pct": funding.get("current_rate_pct"),
                "sentiment": funding.get("sentiment"),
                "contrarian_signal": funding.get("contrarian_signal"),
                "interpretation": funding.get("interpretation"),
            },
            "open_interest": {
                "available": oi_available,
                "trend": oi.get("oi_trend"),
                "change_pct": oi.get("oi_change_pct"),
                "interpretation": oi.get("interpretation"),
            },
            "long_short_ratio": {
                "available": ls_available,
                "score": ls_score,
                "global_ls_ratio": ls.get("global_ls_ratio"),
                "global_long_pct": ls.get("global_long_pct"),
                "top_trader_ls_ratio": ls.get("top_trader_ls_ratio"),
                "retail_sentiment": ls.get("retail_sentiment"),
                "contrarian_signal": ls.get("contrarian_signal"),
                "interpretation": ls.get("interpretation"),
            },
        },
    }
