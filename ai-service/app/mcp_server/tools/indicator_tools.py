"""
Indicator Tools — calculate_indicator, detect_divergence,
get_support_resistance, get_volatility_metrics.

All tools operate on cached OHLCV data via ohlcv_ref.
See mcp_tools.md § 4 for full schema documentation.
"""

import numpy as np
import pandas as pd
import pandas_ta as ta

from app.mcp_server.cache import ohlcv_cache


# ── Helpers ──────────────────────────────────────────────────────────────

def _get_cached_df(ohlcv_ref: str) -> pd.DataFrame | None:
    """Retrieve DataFrame from cache or return None."""
    return ohlcv_cache.get(ohlcv_ref)


def _ref_error() -> dict:
    """Standard error response for unknown ohlcv_ref."""
    return {"isError": True, "content": "Unknown ohlcv_ref, call get_ohlcv first"}


# ── calculate_indicator ─────────────────────────────────────────────────

async def calculate_indicator(
    ohlcv_ref: str,
    indicators: list[dict],
) -> dict:
    """
    Calculate one or more technical indicators on cached OHLCV data.

    Args:
        ohlcv_ref: UUID from get_ohlcv.
        indicators: List of {"name": "rsi", "id": "rsi_14", "params": {"length": 14}}.

    Returns:
        Dict with results keyed by indicator id (or name if id is omitted).
    """
    df = _get_cached_df(ohlcv_ref)
    if df is None:
        return _ref_error()

    results = {}

    for ind in indicators:
        name = ind.get("name", "").lower()
        key_id = ind.get("id", name)
        params = ind.get("params", {})

        try:
            result = _compute_indicator(df, name, params)
            results[key_id] = result
        except Exception as exc:
            results[key_id] = {"error": str(exc)}

    return {"ohlcv_ref": ohlcv_ref, "results": results}


def _compute_indicator(df: pd.DataFrame, name: str, params: dict) -> dict:
    """Compute a single indicator and return structured result."""
    close = df["close"]
    high = df["high"]
    low = df["low"]

    if name == "rsi":
        length = params.get("length", 14)
        rsi_series = ta.rsi(close, length=length)
        if rsi_series is None or rsi_series.empty:
            return {"insufficient_data_for_indicator": True}
        latest = float(rsi_series.iloc[-1])
        state = "oversold" if latest < 30 else ("overbought" if latest > 70 else "neutral")
        return {
            "latest_value": round(latest, 2),
            "series_tail": [round(v, 2) for v in rsi_series.tail(4).tolist()],
            "state": state,
        }

    elif name == "macd":
        fast = params.get("fast", 12)
        slow = params.get("slow", 26)
        signal_len = params.get("signal", 9)
        macd_df = ta.macd(close, fast=fast, slow=slow, signal=signal_len)
        if macd_df is None or macd_df.empty:
            return {"insufficient_data_for_indicator": True}
        macd_line = float(macd_df.iloc[-1, 0])
        signal_line = float(macd_df.iloc[-1, 2])
        histogram = float(macd_df.iloc[-1, 1])
        # Detect cross
        prev_hist = float(macd_df.iloc[-2, 1]) if len(macd_df) > 1 else 0
        cross = "none"
        if prev_hist < 0 and histogram > 0:
            cross = "bullish_cross"
        elif prev_hist > 0 and histogram < 0:
            cross = "bearish_cross"
        return {
            "macd_line": round(macd_line, 2),
            "signal_line": round(signal_line, 2),
            "histogram": round(histogram, 2),
            "cross": cross,
        }

    elif name == "bollinger":
        length = params.get("length", 20)
        std = params.get("std", 2)
        bb = ta.bbands(close, length=length, std=std)
        if bb is None or bb.empty:
            return {"insufficient_data_for_indicator": True}
        lower = float(bb.iloc[-1, 0])
        middle = float(bb.iloc[-1, 1])
        upper = float(bb.iloc[-1, 2])
        price = float(close.iloc[-1])
        position = "inside"
        if price >= upper:
            position = "upper_band"
        elif price <= lower:
            position = "lower_band"
        return {
            "upper": round(upper, 2),
            "middle": round(middle, 2),
            "lower": round(lower, 2),
            "price_position": position,
        }

    elif name == "ema":
        length = params.get("length", 20)
        ema_series = ta.ema(close, length=length)
        if ema_series is None or ema_series.empty:
            return {"insufficient_data_for_indicator": True}
        latest_ema = float(ema_series.iloc[-1])
        price = float(close.iloc[-1])
        return {
            "latest_value": round(latest_ema, 2),
            "price_vs_ema": "above" if price > latest_ema else "below",
        }

    elif name == "sma":
        length = params.get("length", 50)
        sma_series = ta.sma(close, length=length)
        if sma_series is None or sma_series.empty:
            return {"insufficient_data_for_indicator": True}
        latest_sma = float(sma_series.iloc[-1])
        price = float(close.iloc[-1])
        return {
            "latest_value": round(latest_sma, 2),
            "price_vs_sma": "above" if price > latest_sma else "below",
        }

    elif name == "adx":
        length = params.get("length", 14)
        adx_df = ta.adx(high, low, close, length=length)
        if adx_df is None or adx_df.empty:
            return {"insufficient_data_for_indicator": True}
        latest_adx = float(adx_df.iloc[-1, 0])
        strength = "weak" if latest_adx < 20 else ("strong" if latest_adx > 40 else "moderate")
        return {
            "latest_value": round(latest_adx, 2),
            "trend_strength": strength,
        }

    elif name == "atr":
        length = params.get("length", 14)
        atr_series = ta.atr(high, low, close, length=length)
        if atr_series is None or atr_series.empty:
            return {"insufficient_data_for_indicator": True}
        latest_atr = float(atr_series.iloc[-1])
        price = float(close.iloc[-1])
        atr_pct = (latest_atr / price) * 100 if price > 0 else 0
        return {
            "latest_value": round(latest_atr, 2),
            "atr_pct_of_price": round(atr_pct, 2),
        }

    elif name == "stochastic":
        k = params.get("k", 14)
        d = params.get("d", 3)
        smooth_k = params.get("smooth_k", 3)
        stoch = ta.stoch(high, low, close, k=k, d=d, smooth_k=smooth_k)
        if stoch is None or stoch.empty:
            return {"insufficient_data_for_indicator": True}
        return {
            "k_value": round(float(stoch.iloc[-1, 0]), 2),
            "d_value": round(float(stoch.iloc[-1, 1]), 2),
        }

    else:
        return {"isError": True, "content": f"Unsupported indicator: {name}"}


# ── detect_divergence ────────────────────────────────────────────────────

async def detect_divergence(
    ohlcv_ref: str,
    indicator: str = "rsi",
    lookback: int = 50,
) -> dict:
    """
    Detect bullish/bearish divergences between price and an indicator.

    Args:
        ohlcv_ref: UUID from get_ohlcv.
        indicator: "rsi" or "macd".
        lookback: How many candles to look back (default 50).

    Returns:
        Dict with list of detected divergences (max 3).
    """
    df = _get_cached_df(ohlcv_ref)
    if df is None:
        return _ref_error()

    close = df["close"].tail(lookback).values
    timestamps = df["timestamp"].tail(lookback).values

    # Compute indicator series
    if indicator == "rsi":
        ind_series = ta.rsi(df["close"], length=14)
    elif indicator == "macd":
        macd_df = ta.macd(df["close"])
        ind_series = macd_df.iloc[:, 0] if macd_df is not None else None
    else:
        return {"isError": True, "content": f"Unsupported indicator for divergence: {indicator}"}

    if ind_series is None or ind_series.empty:
        return {"ohlcv_ref": ohlcv_ref, "divergences": []}

    ind_values = ind_series.tail(lookback).values

    # Find swing lows and highs (5-candle pivot window)
    divergences = []
    window = 5

    # Find swing lows for bullish divergence
    swing_lows = _find_swing_points(close, timestamps, ind_values, window, "low")
    for i in range(len(swing_lows) - 1):
        p1, p2 = swing_lows[i], swing_lows[i + 1]
        # Price lower low, indicator higher low = bullish divergence
        if p2["price"] < p1["price"] and p2["ind"] > p1["ind"]:
            divergences.append({
                "type": "bullish_divergence",
                "indicator": indicator,
                "price_points": [
                    {"timestamp": str(p1["ts"]), "value": round(p1["price"], 2)},
                    {"timestamp": str(p2["ts"]), "value": round(p2["price"], 2)},
                ],
                "indicator_points": [
                    {"timestamp": str(p1["ts"]), "value": round(p1["ind"], 2)},
                    {"timestamp": str(p2["ts"]), "value": round(p2["ind"], 2)},
                ],
                "description": f"Price made a lower low while {indicator.upper()} made a higher low (bullish divergence)",
            })

    # Find swing highs for bearish divergence
    swing_highs = _find_swing_points(close, timestamps, ind_values, window, "high")
    for i in range(len(swing_highs) - 1):
        p1, p2 = swing_highs[i], swing_highs[i + 1]
        # Price higher high, indicator lower high = bearish divergence
        if p2["price"] > p1["price"] and p2["ind"] < p1["ind"]:
            divergences.append({
                "type": "bearish_divergence",
                "indicator": indicator,
                "price_points": [
                    {"timestamp": str(p1["ts"]), "value": round(p1["price"], 2)},
                    {"timestamp": str(p2["ts"]), "value": round(p2["price"], 2)},
                ],
                "indicator_points": [
                    {"timestamp": str(p1["ts"]), "value": round(p1["ind"], 2)},
                    {"timestamp": str(p2["ts"]), "value": round(p2["ind"], 2)},
                ],
                "description": f"Price made a higher high while {indicator.upper()} made a lower high (bearish divergence)",
            })

    # Return most recent 3
    return {"ohlcv_ref": ohlcv_ref, "divergences": divergences[-3:]}


def _find_swing_points(
    prices: np.ndarray,
    timestamps: np.ndarray,
    indicators: np.ndarray,
    window: int,
    point_type: str,
) -> list[dict]:
    """Find swing high/low pivot points in the series."""
    points = []
    for i in range(window, len(prices) - window):
        if point_type == "low":
            if prices[i] == min(prices[i - window : i + window + 1]):
                points.append({"price": float(prices[i]), "ind": float(indicators[i]), "ts": timestamps[i]})
        else:  # high
            if prices[i] == max(prices[i - window : i + window + 1]):
                points.append({"price": float(prices[i]), "ind": float(indicators[i]), "ts": timestamps[i]})
    return points


# ── get_support_resistance ───────────────────────────────────────────────

async def get_support_resistance(
    ohlcv_ref: str,
    method: str = "swing_points",
    max_levels: int = 3,
) -> dict:
    """
    Detect support and resistance levels from OHLCV data.

    Args:
        ohlcv_ref: UUID from get_ohlcv.
        method: "swing_points" (default) or "volume_profile" (falls back to swing_points).
        max_levels: Maximum number of levels per side (default 3).

    Returns:
        Dict with support_levels, resistance_levels, current_price, nearest levels.
    """
    df = _get_cached_df(ohlcv_ref)
    if df is None:
        return _ref_error()

    close = df["close"].values
    high = df["high"].values
    low = df["low"].values
    current_price = float(close[-1])

    # Always use swing_points for v1 (volume_profile is future work)
    method_used = "swing_points"

    # Find pivot highs and lows (5-candle window)
    window = 5
    pivot_prices = []

    for i in range(window, len(close) - window):
        if low[i] == min(low[i - window : i + window + 1]):
            pivot_prices.append(float(low[i]))
        if high[i] == max(high[i - window : i + window + 1]):
            pivot_prices.append(float(high[i]))

    if not pivot_prices:
        return {
            "ohlcv_ref": ohlcv_ref,
            "method_used": method_used,
            "support_levels": [],
            "resistance_levels": [],
            "current_price": current_price,
            "nearest_support": None,
            "nearest_resistance": None,
        }

    # Group nearby levels (0.5% tolerance)
    tolerance = current_price * 0.005
    grouped = _group_levels(sorted(pivot_prices), tolerance)

    # Separate into support (below) and resistance (above)
    support = sorted([lvl for lvl in grouped if lvl < current_price], reverse=True)[:max_levels]
    resistance = sorted([lvl for lvl in grouped if lvl > current_price])[:max_levels]

    return {
        "ohlcv_ref": ohlcv_ref,
        "method_used": method_used,
        "support_levels": [round(s, 2) for s in support],
        "resistance_levels": [round(r, 2) for r in resistance],
        "current_price": round(current_price, 2),
        "nearest_support": round(support[0], 2) if support else None,
        "nearest_resistance": round(resistance[0], 2) if resistance else None,
    }



def _group_levels(prices: list[float], tolerance: float) -> list[float]:
    """Group nearby price levels within tolerance, returning weighted averages."""
    if not prices:
        return []
    groups: list[list[float]] = [[prices[0]]]
    for price in prices[1:]:
        if abs(price - groups[-1][-1]) <= tolerance:
            groups[-1].append(price)
        else:
            groups.append([price])
    # Sort by "touch count" (more touches = more significant level)
    weighted = sorted(groups, key=len, reverse=True)
    return [sum(g) / len(g) for g in weighted[:10]]


# ── get_volatility_metrics ───────────────────────────────────────────────

async def get_volatility_metrics(
    ohlcv_ref: str,
    atr_length: int = 14,
) -> dict:
    """
    Calculate ATR-based volatility metrics.

    Args:
        ohlcv_ref: UUID from get_ohlcv.
        atr_length: ATR period length (default 14).

    Returns:
        Dict with ATR value, percentage of price, and classification.
    """
    df = _get_cached_df(ohlcv_ref)
    if df is None:
        return _ref_error()

    atr_series = ta.atr(df["high"], df["low"], df["close"], length=atr_length)
    if atr_series is None or atr_series.empty:
        return {"isError": True, "content": "Insufficient data for ATR calculation"}

    current_price = float(df["close"].iloc[-1])
    atr_value = float(atr_series.iloc[-1])
    atr_pct = (atr_value / current_price) * 100 if current_price > 0 else 0

    # Classification thresholds (crypto-calibrated, per mcp_tools.md § 4.4)
    if atr_pct < 0.8:
        classification = "low"
    elif atr_pct <= 2.0:
        classification = "medium"
    else:
        classification = "high"

    return {
        "ohlcv_ref": ohlcv_ref,
        "atr": round(atr_value, 2),
        "atr_pct_of_price": round(atr_pct, 2),
        "volatility_classification": classification,
        "current_price": round(current_price, 2),
    }
