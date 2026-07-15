"""
Liquidity & Order Flow Tools — Binance Futures Public API.

These tools estimate liquidity pools (liquidation clusters) and order book depth
to help the Liquidity Agent identify where the price is likely to be drawn.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
import httpx
import pandas as pd
import pandas_ta as ta

from app.mcp_server.cache import ohlcv_cache

logger = logging.getLogger(__name__)

_FUTURES_BASE = "https://fapi.binance.com"
_HTTP_TIMEOUT = 12.0
_HTTP_HEADERS = {"User-Agent": "Mozilla/5.0"}

def _symbol_to_futures(symbol: str) -> str:
    """Convert 'BTC/USDT' format to Binance Futures format 'BTCUSDT'."""
    return symbol.replace("/", "").upper()

def _get_cached_df(ohlcv_ref: str) -> pd.DataFrame | None:
    return ohlcv_cache.get(ohlcv_ref)

async def get_liquidation_clusters(symbol: str, ohlcv_ref: str | None = None) -> dict:
    """
    Estimate liquidation clusters (liquidity pools) based on current price,
    recent volatility, and Long/Short ratio.

    In the absence of a real-time order book heatmap, this tool uses Binance Futures
    Long/Short ratio and standard high-leverage bands (25x, 50x, 100x) to estimate
    where major liquidations will occur. Price is often drawn to the larger pool.

    Args:
        symbol: Trading pair in 'BTC/USDT' format.

    Returns:
        Dict containing estimated upside and downside liquidity pools and overall bias.
    """
    futures_symbol = _symbol_to_futures(symbol)
    
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT, headers=_HTTP_HEADERS) as client:
            # Get current price
            ticker_resp = await client.get(f"{_FUTURES_BASE}/fapi/v1/ticker/price", params={"symbol": futures_symbol})
            ticker_resp.raise_for_status()
            current_price = float(ticker_resp.json().get("price", 0))

            # Get Top Trader Long/Short Ratio (Accounts) to gauge who is offside
            ls_resp = await client.get(
                f"{_FUTURES_BASE}/futures/data/topLongShortAccountRatio",
                params={"symbol": futures_symbol, "period": "1h", "limit": 1}
            )
            ls_resp.raise_for_status()
            ls_data = ls_resp.json()
            ls_ratio = float(ls_data[0]["longShortRatio"]) if ls_data else 1.0

    except Exception as exc:
        return {"isError": True, "content": f"Failed to fetch liquidity data: {exc}"}

    # Dynamic ATR bands if ohlcv_ref provided
    atr_pct_val = 0.01  # 1% default base
    if ohlcv_ref:
        df = _get_cached_df(ohlcv_ref)
        if df is not None and len(df) >= 15:
            atr = ta.atr(df["high"], df["low"], df["close"], length=14)
            if atr is not None and not atr.empty:
                atr_val = float(atr.iloc[-1])
                if current_price > 0:
                    atr_pct_val = atr_val / current_price

    b1 = atr_pct_val * 0.5
    b2 = atr_pct_val * 1.0
    b3 = atr_pct_val * 2.0

    upside_pools = [
        {"leverage": "100x (est)", "price": round(current_price * (1 + b1), 2)},
        {"leverage": "50x (est)", "price": round(current_price * (1 + b2), 2)},
        {"leverage": "25x (est)", "price": round(current_price * (1 + b3), 2)},
    ]
    
    downside_pools = [
        {"leverage": "100x (est)", "price": round(current_price * (1 - b1), 2)},
        {"leverage": "50x (est)", "price": round(current_price * (1 - b2), 2)},
        {"leverage": "25x (est)", "price": round(current_price * (1 - b3), 2)},
    ]

    # Assess which pool is "heavier" (larger)
    if ls_ratio > 1.05:
        pool_bias = "downside_heavy"
        description = "Market is leaning LONG. Downside liquidity pools (long liquidations) are larger. Risk of long squeeze."
        draw_target = "down"
    elif ls_ratio < 0.95:
        pool_bias = "upside_heavy"
        description = "Market is leaning SHORT. Upside liquidity pools (short liquidations) are larger. Risk of short squeeze."
        draw_target = "up"
    else:
        pool_bias = "balanced"
        description = "Market positioning is balanced. Liquidity pools are evenly distributed."
        draw_target = "neutral"

    pool_magnitude = round(min(1.0, abs(ls_ratio - 1.0) * 5.0), 2)

    return {
        "symbol": symbol,
        "current_price": current_price,
        "long_short_ratio": round(ls_ratio, 2),
        "pool_bias": pool_bias,
        "pool_magnitude": pool_magnitude,
        "draw_target": draw_target,
        "description": description,
        "upside_liquidity": upside_pools,  # Short liquidations
        "downside_liquidity": downside_pools,  # Long liquidations
    }
