"""
Structure Tools — detect_market_structure, detect_market_regime,
calculate_ta_composite_score.

These tools provide deterministic, code-driven market analysis that
eliminates LLM variance in core calculations:

  - detect_market_structure: Identifies swing-point-based market structure
    (Higher Highs/Higher Lows for bullish, Lower Highs/Lower Lows for bearish),
    Break of Structure (BOS) and Character Change (CHoCH) events.

  - detect_market_regime: Classifies current market regime as
    trending_up / trending_down / ranging / breakout based on
    ADX strength, price relative to key EMAs, and structure alignment.

  - calculate_ta_composite_score: Fully deterministic TA sentiment score
    from -1.0 (strongly bearish) to +1.0 (strongly bullish). Eliminates
    LLM-to-LLM variance in scoring the same indicator values.

All tools operate on cached OHLCV data via ohlcv_ref.
See mcp_tools.md § 7 for full schema documentation.
"""

from __future__ import annotations

import math
import logging

import numpy as np
import pandas as pd
import pandas_ta as ta

from app.mcp_server.cache import ohlcv_cache

logger = logging.getLogger(__name__)


# ── Helpers ──────────────────────────────────────────────────────────────

def _smart_round(value: float, sig_digits: int = 4) -> float:
    """Round to N significant digits — preserves precision for micro-cap prices."""
    if value == 0 or math.isnan(value):
        return 0.0
    magnitude = math.floor(math.log10(abs(value)))
    decimals = max(sig_digits - 1 - magnitude, 0)
    return round(value, decimals)


def _get_cached_df(ohlcv_ref: str) -> pd.DataFrame | None:
    return ohlcv_cache.get(ohlcv_ref)


def _ref_error() -> dict:
    return {"isError": True, "content": "Unknown ohlcv_ref — call get_ohlcv first"}


def _find_swing_pivots(
    prices: np.ndarray,
    window: int = 5,
) -> tuple[list[tuple[int, float]], list[tuple[int, float]]]:
    """
    Find swing high and swing low pivot points.

    Returns:
        (swing_lows, swing_highs) as lists of (index, price) tuples.
    """
    swing_lows: list[tuple[int, float]] = []
    swing_highs: list[tuple[int, float]] = []

    for i in range(window, len(prices) - window):
        window_slice = prices[i - window: i + window + 1]
        if prices[i] == window_slice.min():
            swing_lows.append((i, float(prices[i])))
        if prices[i] == window_slice.max():
            swing_highs.append((i, float(prices[i])))

    return swing_lows, swing_highs


# ── detect_market_structure ──────────────────────────────────────────────

async def detect_market_structure(
    ohlcv_ref: str,
    swing_window: int = 5,
    lookback: int = 60,
) -> dict:
    """
    Identify market structure using swing points.

    Detects:
    - Overall structure: bullish (HH/HL), bearish (LH/LL), or ranging
    - Break of Structure (BOS): price closes beyond a prior swing extreme
    - Character Change (CHoCH): structure type reverses (bullish → bearish or vice versa)
    - Key swing levels: last significant swing high and swing low

    Args:
        ohlcv_ref: UUID from get_ohlcv.
        swing_window: Candles each side required to confirm a swing point (default 5).
        lookback: Number of recent candles to analyze (default 60).

    Returns:
        Dict with structure, bos, choch, key_levels, swing_sequence, and confidence.
    """
    df = _get_cached_df(ohlcv_ref)
    if df is None:
        return _ref_error()

    if len(df) < swing_window * 2 + lookback:
        lookback = max(20, len(df) - swing_window * 2)

    recent = df.tail(lookback).reset_index(drop=True)
    close = recent["close"].values
    high = recent["high"].values
    low = recent["low"].values
    current_price = float(close[-1])

    # Find swing pivots on HIGH and LOW separately for precision
    swing_lows, swing_highs = _find_swing_pivots(low, swing_window)
    _, high_pivots = _find_swing_pivots(high, swing_window)

    # Build unified swing sequence sorted by index
    # Use closing prices for BOS/CHoCH comparison
    all_swings: list[dict] = []
    for idx, price in swing_lows:
        all_swings.append({"idx": idx, "type": "low", "price": price})
    for idx, price in high_pivots:
        all_swings.append({"idx": idx, "type": "high", "price": price})
    all_swings.sort(key=lambda x: x["idx"])

    if len(all_swings) < 3:
        return {
            "ohlcv_ref": ohlcv_ref,
            "structure": "undefined",
            "confidence": 0.30,
            "reason": "Insufficient swing points detected — need more candles",
            "bos": None,
            "choch": None,
            "key_levels": {"swing_high": None, "swing_low": None},
            "swing_sequence": [],
        }

    # ── Identify HH/HL vs LH/LL ──────────────────────────────────────────
    # Separate highs and lows and compare consecutive pairs
    highs_list = [s for s in all_swings if s["type"] == "high"]
    lows_list = [s for s in all_swings if s["type"] == "low"]

    bullish_count = 0
    bearish_count = 0

    # Check for Higher Highs (HH)
    for i in range(1, len(highs_list)):
        if highs_list[i]["price"] > highs_list[i - 1]["price"]:
            bullish_count += 1
        else:
            bearish_count += 1

    # Check for Higher Lows (HL) — reinforces bullish structure
    for i in range(1, len(lows_list)):
        if lows_list[i]["price"] > lows_list[i - 1]["price"]:
            bullish_count += 1
        else:
            bearish_count += 1

    total_comparisons = bullish_count + bearish_count
    if total_comparisons == 0:
        structure = "ranging"
        structure_confidence = 0.40
    else:
        bull_ratio = bullish_count / total_comparisons
        if bull_ratio >= 0.65:
            structure = "bullish"
            structure_confidence = round(0.50 + (bull_ratio - 0.65) * 1.4, 2)
        elif bull_ratio <= 0.35:
            structure = "bearish"
            structure_confidence = round(0.50 + (0.35 - bull_ratio) * 1.4, 2)
        else:
            structure = "ranging"
            structure_confidence = round(0.40 + abs(0.50 - bull_ratio) * 0.5, 2)

    structure_confidence = min(0.90, max(0.30, structure_confidence))

    # ── Detect BOS (Break of Structure) ──────────────────────────────────
    # BOS: latest close breaks beyond the most recent confirmed swing extreme
    bos = None
    last_swing_high = highs_list[-1]["price"] if highs_list else None
    last_swing_low = lows_list[-1]["price"] if lows_list else None

    if last_swing_high and current_price > last_swing_high:
        bos = {
            "type": "bullish_bos",
            "level": _smart_round(last_swing_high),
            "current_price": _smart_round(current_price),
            "description": (
                f"Price ({current_price:.2f}) broke above last swing high ({last_swing_high:.2f}) — "
                "bullish Break of Structure. Trend continuation likely."
            ),
        }
    elif last_swing_low and current_price < last_swing_low:
        bos = {
            "type": "bearish_bos",
            "level": _smart_round(last_swing_low),
            "current_price": _smart_round(current_price),
            "description": (
                f"Price ({current_price:.2f}) broke below last swing low ({last_swing_low:.2f}) — "
                "bearish Break of Structure. Trend continuation likely."
            ),
        }

    # ── Detect CHoCH (Character Change) ──────────────────────────────────
    # CHoCH: prior structure was bullish but latest high is a Lower High (LH),
    # or prior structure was bearish but latest low is a Higher Low (HL).
    choch = None
    if len(highs_list) >= 2 and structure == "bullish":
        if highs_list[-1]["price"] < highs_list[-2]["price"]:
            choch = {
                "type": "bearish_choch",
                "price": _smart_round(highs_list[-1]["price"]),
                "description": (
                    "Lower High formed in a bullish structure — potential Character Change. "
                    "Watch for confirmation: bearish BOS would confirm reversal."
                ),
            }
    elif len(lows_list) >= 2 and structure == "bearish":
        if lows_list[-1]["price"] > lows_list[-2]["price"]:
            choch = {
                "type": "bullish_choch",
                "price": _smart_round(lows_list[-1]["price"]),
                "description": (
                    "Higher Low formed in a bearish structure — potential Character Change. "
                    "Watch for confirmation: bullish BOS would confirm reversal."
                ),
            }

    # ── Key Levels ────────────────────────────────────────────────────────
    key_levels = {
        "swing_high": _smart_round(last_swing_high) if last_swing_high else None,
        "swing_low": _smart_round(last_swing_low) if last_swing_low else None,
    }

    # Compact swing sequence for context (last 6 events)
    swing_sequence = [
        {"type": s["type"], "price": _smart_round(s["price"])}
        for s in all_swings[-6:]
    ]

    return {
        "ohlcv_ref": ohlcv_ref,
        "structure": structure,
        "confidence": structure_confidence,
        "bullish_signals": bullish_count,
        "bearish_signals": bearish_count,
        "bos": bos,
        "choch": choch,
        "key_levels": key_levels,
        "swing_sequence": swing_sequence,
        "current_price": _smart_round(current_price),
    }


# ── detect_market_regime ─────────────────────────────────────────────────

async def detect_market_regime(
    ohlcv_ref: str,
) -> dict:
    """
    Classify the current market regime using ADX, EMA alignment, and
    Bollinger Band width as regime indicators.

    Regimes:
    - trending_up:   Strong trend upward (ADX > 25, price > EMA20 > EMA50)
    - trending_down: Strong trend downward (ADX > 25, price < EMA20 < EMA50)
    - ranging:       Weak trend (ADX < 20), price oscillating inside Bollinger Bands
    - breakout:      ADX rising rapidly from range, BB squeeze recently resolved,
                     or sudden volume spike with directional close

    Args:
        ohlcv_ref: UUID from get_ohlcv.

    Returns:
        Dict with regime, adx_value, ema_alignment, bb_width_pct,
        trend_strength, and description.
    """
    df = _get_cached_df(ohlcv_ref)
    if df is None:
        return _ref_error()

    if len(df) < 55:
        return {
            "isError": True,
            "content": "Insufficient data for regime detection (need 55+ candles)",
        }

    close = df["close"]
    high = df["high"]
    low = df["low"]
    volume = df["volume"]

    # ── Indicators ────────────────────────────────────────────────────────
    adx_df = ta.adx(high, low, close, length=14)
    ema_20 = ta.ema(close, length=20)
    ema_50 = ta.ema(close, length=50)
    bb = ta.bbands(close, length=20, std=2)

    if adx_df is None or ema_20 is None or ema_50 is None or bb is None:
        return {"isError": True, "content": "Failed to calculate regime indicators"}

    current_price = float(close.iloc[-1])
    adx_value = float(adx_df.iloc[-1, 0])
    adx_prev = float(adx_df.iloc[-3, 0]) if len(adx_df) >= 3 else adx_value
    ema20_val = float(ema_20.iloc[-1])
    ema50_val = float(ema_50.iloc[-1])

    # Bollinger Band width as percentage of middle band (squeeze indicator)
    bb_upper = float(bb.iloc[-1, 2])
    bb_lower = float(bb.iloc[-1, 0])
    bb_middle = float(bb.iloc[-1, 1])
    bb_width_pct = ((bb_upper - bb_lower) / bb_middle * 100) if bb_middle > 0 else 0.0

    # Historical BB width for squeeze detection (last 20 bars)
    bb_widths_recent = []
    for i in range(max(0, len(bb) - 20), len(bb)):
        row = bb.iloc[i]
        mid = float(row.iloc[1])
        if mid > 0:
            bb_widths_recent.append((float(row.iloc[2]) - float(row.iloc[0])) / mid * 100)
    avg_bb_width = sum(bb_widths_recent) / len(bb_widths_recent) if bb_widths_recent else bb_width_pct
    bb_squeeze = bb_width_pct < avg_bb_width * 0.70  # current width is 30%+ below average = squeeze

    # Volume spike detection
    vol_20_avg = float(volume.tail(20).mean())
    vol_latest = float(volume.iloc[-1])
    volume_spike = vol_latest > vol_20_avg * 2.0

    # ── EMA Alignment ─────────────────────────────────────────────────────
    if current_price > ema20_val > ema50_val:
        ema_alignment = "bullish"
    elif current_price < ema20_val < ema50_val:
        ema_alignment = "bearish"
    elif current_price > ema20_val and ema20_val < ema50_val:
        ema_alignment = "recovering"  # price above EMA20 but EMA20 still below EMA50
    elif current_price < ema20_val and ema20_val > ema50_val:
        ema_alignment = "weakening"  # price below EMA20 but EMA20 still above EMA50
    else:
        ema_alignment = "neutral"

    # ── Trend Strength Classification ─────────────────────────────────────
    if adx_value >= 40:
        trend_strength = "strong"
    elif adx_value >= 25:
        trend_strength = "moderate"
    elif adx_value >= 15:
        trend_strength = "weak"
    else:
        trend_strength = "very_weak"

    # ── Regime Classification ─────────────────────────────────────────────
    adx_rising = adx_value > adx_prev * 1.10  # ADX rose 10%+ recently

    if adx_value >= 25 and ema_alignment == "bullish":
        regime = "trending_up"
        description = (
            f"Strong uptrend. ADX={adx_value:.1f} (above 25), "
            f"Price > EMA20({ema20_val:.0f}) > EMA50({ema50_val:.0f}). "
            "Trend-following setups preferred."
        )
    elif adx_value >= 25 and ema_alignment == "bearish":
        regime = "trending_down"
        description = (
            f"Strong downtrend. ADX={adx_value:.1f} (above 25), "
            f"Price < EMA20({ema20_val:.0f}) < EMA50({ema50_val:.0f}). "
            "Short setups preferred or wait for reversal signals."
        )
    elif (adx_rising and adx_value > 20) or (volume_spike and not bb_squeeze):
        regime = "breakout"
        direction = "bullish" if current_price > ema20_val else "bearish"
        description = (
            f"Breakout conditions. ADX rising ({adx_prev:.1f} → {adx_value:.1f}), "
            f"{'volume spike detected' if volume_spike else 'trend acceleration'}. "
            f"Direction bias: {direction}. "
            "Enter with confirmation — avoid chasing the first candle."
        )
    else:
        regime = "ranging"
        description = (
            f"Range-bound market. ADX={adx_value:.1f} (below 25), "
            f"BB width={bb_width_pct:.1f}%{'  — SQUEEZE active, breakout imminent' if bb_squeeze else ''}. "
            "Mean-reversion setups at range extremes preferred. "
            "Watch for breakout confirmation."
        )

    return {
        "ohlcv_ref": ohlcv_ref,
        "regime": regime,
        "description": description,
        "adx_value": round(adx_value, 2),
        "trend_strength": trend_strength,
        "ema_alignment": ema_alignment,
        "ema_20": _smart_round(ema20_val),
        "ema_50": _smart_round(ema50_val),
        "bb_width_pct": round(bb_width_pct, 2),
        "bb_squeeze": bb_squeeze,
        "volume_spike": volume_spike,
        "current_price": _smart_round(current_price),
    }


# ── calculate_ta_composite_score ─────────────────────────────────────────

async def calculate_ta_composite_score(
    ohlcv_ref: str,
) -> dict:
    """
    Calculate a fully deterministic composite TA sentiment score.

    This tool eliminates LLM variance in TA scoring. The same indicator
    values always produce the same score. The LLM's role is INTERPRETATION
    and CONTEXT, not number generation.

    Score: -1.0 (strongly bearish) to +1.0 (strongly bullish)

    Weighting:
    - EMA Trend Alignment (30%): EMA20/50 crossover and price position
    - Momentum (25%): RSI oversold/overbought + MACD signal line cross
    - Bollinger Bands (15%): Price at band extremes (mean reversion signal)
    - Trend Strength Multiplier (15%): ADX amplifies or dampens signal
    - Divergence (15%): RSI or MACD divergence against price direction

    Args:
        ohlcv_ref: UUID from get_ohlcv.

    Returns:
        Dict with score (-1.0 to 1.0), sentiment label, component breakdown,
        and confidence calibration factors.
    """
    df = _get_cached_df(ohlcv_ref)
    if df is None:
        return _ref_error()

    if len(df) < 55:
        return {
            "isError": True,
            "content": "Insufficient candles for composite scoring (need 55+)",
        }

    close = df["close"]
    high = df["high"]
    low = df["low"]

    # ── Compute all indicators ────────────────────────────────────────────
    try:
        rsi_series = ta.rsi(close, length=14)
        macd_df = ta.macd(close, fast=12, slow=26, signal=9)
        bb_df = ta.bbands(close, length=20, std=2)
        ema_20_series = ta.ema(close, length=20)
        ema_50_series = ta.ema(close, length=50)
        adx_df = ta.adx(high, low, close, length=14)
    except Exception as exc:
        return {"isError": True, "content": f"Indicator computation failed: {exc}"}

    # Validate all series exist
    if any(s is None or (hasattr(s, "empty") and s.empty) for s in [
        rsi_series, macd_df, bb_df, ema_20_series, ema_50_series, adx_df
    ]):
        return {"isError": True, "content": "One or more indicators returned empty data"}

    current_price = float(close.iloc[-1])
    rsi = float(rsi_series.iloc[-1])
    rsi_prev = float(rsi_series.iloc[-2]) if len(rsi_series) >= 2 else rsi

    macd_line = float(macd_df.iloc[-1, 0])
    signal_line = float(macd_df.iloc[-1, 2])
    histogram = float(macd_df.iloc[-1, 1])
    prev_histogram = float(macd_df.iloc[-2, 1]) if len(macd_df) >= 2 else histogram

    bb_upper = float(bb_df.iloc[-1, 2])
    bb_lower = float(bb_df.iloc[-1, 0])
    bb_middle = float(bb_df.iloc[-1, 1])

    ema_20 = float(ema_20_series.iloc[-1])
    ema_50 = float(ema_50_series.iloc[-1])
    adx = float(adx_df.iloc[-1, 0])

    # ── Component Scoring ─────────────────────────────────────────────────
    score = 0.0
    components: dict[str, float] = {}

    # 1. EMA Trend Alignment (weight 0.30)
    # Price position relative to EMAs and EMA crossover
    ema_score = 0.0
    if current_price > ema_20:
        ema_score += 0.15
    else:
        ema_score -= 0.15
    if ema_20 > ema_50:
        ema_score += 0.15
    else:
        ema_score -= 0.15
    components["ema_trend"] = round(ema_score, 3)
    score += ema_score

    # 2. RSI Momentum (weight 0.15)
    rsi_score = 0.0
    if rsi < 30:
        # Oversold — bullish rebound potential
        rsi_score = 0.15
    elif rsi < 40:
        # Near oversold — mildly bullish
        rsi_score = 0.07
    elif rsi > 70:
        # Overbought — bearish reversal risk
        rsi_score = -0.15
    elif rsi > 60:
        # Near overbought — mildly bearish
        rsi_score = -0.07
    # 40-60 = neutral = 0
    components["rsi_momentum"] = round(rsi_score, 3)
    score += rsi_score

    # 3. MACD Signal (weight 0.10)
    macd_score = 0.0
    if histogram > 0 and prev_histogram <= 0:
        # Fresh bullish cross — strong signal
        macd_score = 0.10
    elif histogram < 0 and prev_histogram >= 0:
        # Fresh bearish cross — strong signal
        macd_score = -0.10
    elif histogram > 0:
        # Above zero line — mildly bullish
        macd_score = 0.04
    elif histogram < 0:
        # Below zero line — mildly bearish
        macd_score = -0.04
    components["macd_signal"] = round(macd_score, 3)
    score += macd_score

    # 4. Bollinger Band position (weight 0.15)
    bb_score = 0.0
    if current_price <= bb_lower:
        # At or below lower band — mean reversion up likely
        bb_score = 0.15
    elif current_price >= bb_upper:
        # At or above upper band — mean reversion down likely
        bb_score = -0.15
    elif current_price < bb_middle:
        # Below midband — mildly bearish positioning
        bb_score = -0.04
    else:
        # Above midband — mildly bullish positioning
        bb_score = 0.04
    components["bollinger_position"] = round(bb_score, 3)
    score += bb_score

    # 5. Divergence detection (weight 0.15)
    divergence_score = 0.0
    divergence_found = None
    rsi_series_values = rsi_series.tail(30).values
    close_values = close.tail(30).values

    # Simple 3-point divergence check on RSI vs price
    if len(rsi_series_values) >= 10:
        # Look for last two swing lows in price
        price_lows = []
        rsi_at_lows = []
        for i in range(5, len(close_values) - 5):
            if close_values[i] == min(close_values[i - 5: i + 5]):
                price_lows.append(close_values[i])
                rsi_at_lows.append(rsi_series_values[i])

        if len(price_lows) >= 2:
            if price_lows[-1] < price_lows[-2] and rsi_at_lows[-1] > rsi_at_lows[-2]:
                # Price lower low, RSI higher low = bullish divergence
                divergence_score = 0.15
                divergence_found = "bullish_divergence"
            elif price_lows[-1] > price_lows[-2] and rsi_at_lows[-1] < rsi_at_lows[-2]:
                # Price higher low, RSI lower low on swing highs = bearish divergence
                divergence_score = -0.15
                divergence_found = "bearish_divergence"

    components["divergence"] = round(divergence_score, 3)
    score += divergence_score

    # ── ADX Strength Multiplier ───────────────────────────────────────────
    # Strong trend amplifies the score, weak/no trend dampens it
    if adx >= 40:
        adx_multiplier = 1.30  # Very strong trend — high conviction
    elif adx >= 25:
        adx_multiplier = 1.10  # Moderate trend — slight boost
    elif adx >= 15:
        adx_multiplier = 0.90  # Weak trend — slight dampening
    else:
        adx_multiplier = 0.70  # Very weak — no trend conviction
    components["adx_multiplier"] = round(adx_multiplier, 2)
    score *= adx_multiplier

    # ── Final clamp and sentiment label ──────────────────────────────────
    score = max(-1.0, min(1.0, round(score, 4)))

    if score >= 0.30:
        sentiment = "bullish"
    elif score <= -0.30:
        sentiment = "bearish"
    else:
        sentiment = "neutral"

    # ── Confidence calibration ────────────────────────────────────────────
    # Base confidence on ADX and signal agreement
    base_confidence = 0.60

    # Boost when EMA and MACD agree on direction
    if (ema_score > 0 and macd_score >= 0) or (ema_score < 0 and macd_score <= 0):
        base_confidence += 0.10  # signals aligned

    # Boost for strong trend
    if adx >= 25:
        base_confidence += 0.08

    # Boost for divergence
    if divergence_found:
        base_confidence += 0.08

    # Penalize near-neutral score (mixed signals)
    if abs(score) < 0.15:
        base_confidence -= 0.12

    confidence = round(max(0.25, min(0.90, base_confidence)), 2)

    return {
        "ohlcv_ref": ohlcv_ref,
        "composite_score": score,
        "sentiment": sentiment,
        "confidence": confidence,
        "divergence_detected": divergence_found,
        "adx": round(adx, 2),
        "adx_multiplier": adx_multiplier,
        "rsi": round(rsi, 2),
        "components": components,
        "raw_score_before_adx": round(
            components["ema_trend"]
            + components["rsi_momentum"]
            + components["macd_signal"]
            + components["bollinger_position"]
            + components["divergence"],
            4,
        ),
        "indicator_values": {
            "rsi": round(rsi, 2),
            "macd_histogram": _smart_round(histogram),
            "ema_20": _smart_round(ema_20),
            "ema_50": _smart_round(ema_50),
            "bb_upper": _smart_round(bb_upper),
            "bb_lower": _smart_round(bb_lower),
            "price": _smart_round(current_price),
            "price_vs_ema20": "above" if current_price > ema_20 else "below",
            "price_vs_ema50": "above" if current_price > ema_50 else "below",
        },
    }
