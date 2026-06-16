"""
Internal MCP Server — stdio transport.

Registers all 7 tools and runs as a subprocess invoked by
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
    get_pair_news,
    get_market_news,
)

# Create MCP server instance
server = Server("confluence-trade-tools")


# ── Tool Definitions ─────────────────────────────────────────────────────

@server.list_tools()
async def list_tools() -> list[Tool]:
    """Register all 7 MCP tools with their JSON schemas."""
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
                                "params": {"type": "object", "description": "Indicator-specific parameters"},
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
            name="get_pair_news",
            description="Fetch pair-specific crypto news from CryptoPanic with sentiment scoring.",
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
            description="Search for general crypto market news (regulation, macro events) via web search.",
            inputSchema={
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "Search query for macro crypto news"},
                    "max_results": {"type": "integer", "default": 5},
                },
                "required": ["topic"],
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
        "get_pair_news": get_pair_news,
        "get_market_news": get_market_news,
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
