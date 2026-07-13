"""
Internal MCP Server — stdio transport.

Registers all 10 tools and runs as a subprocess invoked by
CrewAI agents via MCPServerStdio transport.

See architecture.md § 3.4 and mcp_tools.md for full documentation.

Usage (called by CrewAI internally):
    python -m app.mcp_server.server
"""

import asyncio
import json

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from app.mcp_server.tools import (
    get_ohlcv,
    calculate_indicator,
    detect_divergence,
    get_support_resistance,
    get_volatility_metrics,
    analyze_volume_profile,
    get_pair_news,
    get_market_news,
    scrape_article,
    get_funding_rate,
    get_open_interest,
    get_long_short_ratio,
    get_derivatives_summary,
    # Structure & Regime tools (Faz 1)
    detect_market_structure,
    detect_market_regime,
    calculate_ta_composite_score,
    # Liquidity tools (Faz 4)
    get_liquidation_clusters,
)

# Create MCP server instance
server = Server("confluence-trade-tools")


# ── Tool Definitions ─────────────────────────────────────────────────────

@server.list_tools()
async def list_tools() -> list[Tool]:
    """Register all MCP tools with their JSON schemas."""
    return [
        Tool(
            name="get_ohlcv",
            description="Fetch OHLCV candlestick data from Binance for a given trading pair and timeframe.",
            inputSchema={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Trading pair, e.g. 'BTC/USDT'"},
                    "timeframe": {"type": "string", "description": "Candle interval: '15m','1h','4h','1d'", "default": "4h"},
                    "limit": {"type": "integer", "description": "Number of candles (max 1000)", "default": 200},
                },
                "required": ["symbol"],
            },
        ),
        Tool(
            name="calculate_indicator",
            description="Calculate technical indicators (RSI, MACD, Bollinger, EMA, SMA, ADX, ATR, Stochastic) on cached OHLCV data.",
            inputSchema={
                "type": "object",
                "properties": {
                    "ohlcv_ref": {"type": "string", "description": "UUID reference from get_ohlcv"},
                    "indicators": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string", "description": "Indicator name: rsi, macd, bollinger, ema, sma, adx, atr, stochastic"},
                                "id": {"type": "string", "description": "Unique ID to prevent overwrites (e.g., 'ema_20', 'ema_50'). Optional."},
                                "params": {"type": "object", "description": "Indicator-specific parameters (e.g. {'length': 20}). Omit or use {} for defaults."},
                            },
                            "required": ["name"],
                        },
                    },
                },
                "required": ["ohlcv_ref", "indicators"],
            },
        ),
        Tool(
            name="detect_divergence",
            description="Detect bullish/bearish divergences between price and a momentum indicator (RSI or MACD).",
            inputSchema={
                "type": "object",
                "properties": {
                    "ohlcv_ref": {"type": "string"},
                    "indicator": {"type": "string", "default": "rsi", "description": "rsi or macd"},
                    "lookback": {"type": "integer", "default": 50},
                },
                "required": ["ohlcv_ref"],
            },
        ),
        Tool(
            name="get_support_resistance",
            description="Detect support and resistance price levels from OHLCV data using swing point analysis.",
            inputSchema={
                "type": "object",
                "properties": {
                    "ohlcv_ref": {"type": "string"},
                    "method": {"type": "string", "default": "swing_points"},
                    "max_levels": {"type": "integer", "default": 3},
                },
                "required": ["ohlcv_ref"],
            },
        ),
        Tool(
            name="get_volatility_metrics",
            description="Calculate ATR-based volatility metrics with low/medium/high classification.",
            inputSchema={
                "type": "object",
                "properties": {
                    "ohlcv_ref": {"type": "string"},
                    "atr_length": {"type": "integer", "default": 14},
                },
                "required": ["ohlcv_ref"],
            },
        ),
        Tool(
            name="analyze_volume_profile",
            description="Analyze volume profile: VWAP, volume spikes (>2x avg), and volume trend (increasing/decreasing/flat).",
            inputSchema={
                "type": "object",
                "properties": {
                    "ohlcv_ref": {"type": "string", "description": "UUID reference from get_ohlcv"},
                    "lookback": {"type": "integer", "default": 20, "description": "Candles to analyze"},
                },
                "required": ["ohlcv_ref"],
            },
        ),
        Tool(
            name="get_pair_news",
            description="Fetch pair-specific crypto news from CryptoPanic, CoinGecko, RSS with multi-factor scoring.",
            inputSchema={
                "type": "object",
                "properties": {
                    "base_asset": {"type": "string", "description": "Coin symbol, e.g. 'BTC'"},
                    "limit": {"type": "integer", "default": 10},
                },
                "required": ["base_asset"],
            },
        ),
        Tool(
            name="get_market_news",
            description="Search for general crypto market news (regulation, macro events) via RSS, CoinGecko, and web search.",
            inputSchema={
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "Search query for macro crypto news"},
                    "max_results": {"type": "integer", "default": 5},
                },
                "required": ["topic"],
            },
        ),
        Tool(
            name="scrape_article",
            description="Fetch and extract full readable text content from a news article URL for deep analysis.",
            inputSchema={
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Full article URL to scrape"},
                    "max_chars": {"type": "integer", "default": 4000, "description": "Max characters to return"},
                },
                "required": ["url"],
            },
        ),
        # ── On-Chain / Derivatives Tools ─────────────────────────────────────
        Tool(
            name="get_funding_rate",
            description=(
                "Fetch current and historical funding rates from Binance Futures. "
                "Positive rates = longs paying shorts (bearish contrarian). "
                "Negative rates = shorts paying longs (bullish contrarian). "
                "Extreme rates (>±0.05%) are strong squeeze risk signals."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Trading pair, e.g. 'BTC/USDT'"},
                    "limit": {"type": "integer", "default": 8, "description": "Number of historical periods"},
                },
                "required": ["symbol"],
            },
        ),
        Tool(
            name="get_open_interest",
            description=(
                "Fetch open interest (total outstanding contracts) from Binance Futures. "
                "Rising OI + rising price = healthy trend. Falling OI + rising price = weakness. "
                "Sharp OI drops signal potential liquidation cascades."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Trading pair, e.g. 'BTC/USDT'"},
                },
                "required": ["symbol"],
            },
        ),
        Tool(
            name="get_long_short_ratio",
            description=(
                "Fetch global and top-trader long/short account ratios from Binance Futures. "
                "Extreme long bias (>70% longs) is a contrarian bearish signal. "
                "Extreme short bias (<30% longs) is a contrarian bullish signal."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Trading pair, e.g. 'BTC/USDT'"},
                    "period": {"type": "string", "default": "1h", "description": "Interval: 5m|15m|1h|4h|1d"},
                },
                "required": ["symbol"],
            },
        ),
        Tool(
            name="get_derivatives_summary",
            description=(
                "PRIMARY on-chain tool. Aggregates funding rate + open interest + long/short ratio "
                "into a single composite derivatives sentiment score (-1.0 to +1.0). "
                "Call this first for a comprehensive overview; use individual tools for drill-down."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Trading pair, e.g. 'BTC/USDT'"},
                },
                "required": ["symbol"],
            },
        ),
        # ── Structure & Regime Tools (Faz 1) ─────────────────────────────────
        Tool(
            name="detect_market_structure",
            description=(
                "Detect price action market structure using swing points. "
                "Identifies Higher Highs/Higher Lows (bullish) or Lower Highs/Lower Lows (bearish). "
                "Detects Break of Structure (BOS) — price closes beyond last swing extreme — and "
                "Character Change (CHoCH) — first sign of structure reversal. "
                "Call this BEFORE TA indicators to understand the structural context."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "ohlcv_ref": {"type": "string", "description": "UUID reference from get_ohlcv"},
                    "swing_window": {"type": "integer", "default": 5, "description": "Candles each side to confirm a pivot (default 5)"},
                    "lookback": {"type": "integer", "default": 60, "description": "Recent candles to analyze (default 60)"},
                },
                "required": ["ohlcv_ref"],
            },
        ),
        Tool(
            name="detect_market_regime",
            description=(
                "Classify the current market regime: trending_up / trending_down / ranging / breakout. "
                "Uses ADX strength (>25 = trending, <20 = ranging), EMA20/50 alignment, "
                "Bollinger Band width squeeze, and volume spikes. "
                "Regime determines which trade strategy is most appropriate."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "ohlcv_ref": {"type": "string", "description": "UUID reference from get_ohlcv"},
                },
                "required": ["ohlcv_ref"],
            },
        ),
        Tool(
            name="calculate_ta_composite_score",
            description=(
                "Compute a fully DETERMINISTIC composite TA sentiment score from -1.0 (strongly bearish) "
                "to +1.0 (strongly bullish). "
                "Unlike asking the LLM to score indicators, this tool always produces the same score "
                "for the same market data. Components: EMA trend alignment (30%), RSI momentum (15%), "
                "MACD signal cross (10%), Bollinger Band position (15%), RSI divergence (15%), "
                "ADX strength multiplier (amplifies or dampens the score). "
                "Use this score as the authoritative TA sentiment_score — interpret it, do not override it."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "ohlcv_ref": {"type": "string", "description": "UUID reference from get_ohlcv"},
                },
                "required": ["ohlcv_ref"],
            },
        ),
        Tool(
            name="get_liquidation_clusters",
            description="Estimate liquidation clusters and liquidity pools based on OI, long/short ratio, and current price.",
            inputSchema={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Trading pair, e.g. 'BTC/USDT'"},
                },
                "required": ["symbol"],
            },
        ),
    ]


# ── Tool Call Handler ────────────────────────────────────────────────────

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Route tool calls to the appropriate implementation."""
    tool_map = {
        "get_ohlcv": get_ohlcv,
        "calculate_indicator": calculate_indicator,
        "detect_divergence": detect_divergence,
        "get_support_resistance": get_support_resistance,
        "get_volatility_metrics": get_volatility_metrics,
        "analyze_volume_profile": analyze_volume_profile,
        "get_pair_news": get_pair_news,
        "get_market_news": get_market_news,
        "scrape_article": scrape_article,
        # On-Chain tools
        "get_funding_rate": get_funding_rate,
        "get_open_interest": get_open_interest,
        "get_long_short_ratio": get_long_short_ratio,
        "get_derivatives_summary": get_derivatives_summary,
        # Structure & Regime tools (Faz 1)
        "detect_market_structure": detect_market_structure,
        "detect_market_regime": detect_market_regime,
        "calculate_ta_composite_score": calculate_ta_composite_score,
        # Liquidity tools (Faz 4)
        "get_liquidation_clusters": get_liquidation_clusters,
    }

    handler = tool_map.get(name)
    if handler is None:
        return [TextContent(type="text", text=json.dumps({"isError": True, "content": f"Unknown tool: {name}"}))]

    result = await handler(**arguments)
    return [TextContent(type="text", text=json.dumps(result, default=str))]


# ── Main Entry Point ─────────────────────────────────────────────────────

async def main() -> None:
    """Run the MCP server with stdio transport."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
