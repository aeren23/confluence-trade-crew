"""
MCP Server tools — Data, Indicator, News, and On-Chain tools.
"""

from app.mcp_server.tools.data_tools import get_ohlcv
from app.mcp_server.tools.indicator_tools import (
    calculate_indicator,
    detect_divergence,
    get_support_resistance,
    get_volatility_metrics,
    analyze_volume_profile,
)
from app.mcp_server.tools.news_tools import get_market_news, get_pair_news, scrape_article
from app.mcp_server.tools.onchain_tools import (
    get_funding_rate,
    get_open_interest,
    get_long_short_ratio,
    get_derivatives_summary,
)

__all__ = [
    "get_ohlcv",
    "calculate_indicator",
    "detect_divergence",
    "get_support_resistance",
    "get_volatility_metrics",
    "analyze_volume_profile",
    "get_pair_news",
    "get_market_news",
    "scrape_article",
    "get_funding_rate",
    "get_open_interest",
    "get_long_short_ratio",
    "get_derivatives_summary",
]
