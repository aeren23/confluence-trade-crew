"""
Data Tools — get_ohlcv.

Fetches OHLCV (Open-High-Low-Close-Volume) candlestick data from
Binance via ccxt. Stores the result in the in-memory OHLCVCache and
returns a UUID reference for downstream indicator tools.

See mcp_tools.md § 3.1 for full schema documentation.
"""

from datetime import datetime, timezone

import ccxt
import pandas as pd

from app.config import settings
from app.mcp_server.cache import ohlcv_cache


async def get_ohlcv(
    symbol: str,
    timeframe: str = "4h",
    limit: int = 200,
) -> dict:
    """
    Fetch OHLCV data from Binance and cache it.

    Args:
        symbol: Trading pair in ccxt format, e.g. "BTC/USDT".
        timeframe: Candle interval, e.g. "15m", "1h", "4h", "1d".
        limit: Number of candles to fetch (max 1000, default 200).

    Returns:
        Dict with ohlcv_ref, candle summary, latest price, and data quality.

    Raises:
        ValueError: If symbol is not found on Binance.
        RuntimeError: If exchange API returns an error.
    """
    limit = min(limit, 1000)

    # Initialize ccxt Binance exchange
    exchange_config: dict = {"enableRateLimit": True}
    if settings.binance_api_key:
        exchange_config["apiKey"] = settings.binance_api_key
        exchange_config["secret"] = settings.binance_api_secret

    # Route through Cloudflare WARP SOCKS5 proxy if configured.
    # This allows Docker containers to reach Binance via the VPN tunnel.
    # HTTPS_PROXY env var is set in docker-compose.yml pointing to host.docker.internal:40000
    import os
    proxy_url = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
    if proxy_url:
        exchange_config["proxies"] = {
            "http": proxy_url,
            "https": proxy_url,
        }

    exchange = ccxt.binance(exchange_config)

    try:
        raw_ohlcv = exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
    except ccxt.BadSymbol:
        return {
            "isError": True,
            "content": f"Symbol not found on Binance: {symbol}",
        }
    except ccxt.BaseError as exc:
        return {
            "isError": True,
            "content": f"Exchange API error: {exc}",
        }

    if not raw_ohlcv:
        return {
            "isError": True,
            "content": f"No data returned for {symbol} {timeframe}",
        }

    # Convert to DataFrame
    df = pd.DataFrame(
        raw_ohlcv,
        columns=["timestamp", "open", "high", "low", "close", "volume"],
    )
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)

    # Store in cache
    ohlcv_ref = ohlcv_cache.store(df)

    # Assess data quality
    candle_count = len(df)
    data_quality = "ok"
    if candle_count < 50:
        data_quality = "insufficient_data"
    elif candle_count < limit * 0.95:
        data_quality = "gap_detected"

    # Build candles list (last 5 for summary, full data in cache)
    latest = df.iloc[-1]
    candles = [
        {
            "timestamp": row["timestamp"].isoformat(),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": float(row["volume"]),
        }
        for _, row in df.tail(5).iterrows()
    ]

    return {
        "ohlcv_ref": ohlcv_ref,
        "symbol": symbol,
        "timeframe": timeframe,
        "candle_count": candle_count,
        "candles": candles,
        "latest_price": float(latest["close"]),
        "latest_timestamp": latest["timestamp"].isoformat(),
        "data_quality": data_quality,
    }
