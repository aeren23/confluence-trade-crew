"""
MCP Server tools — Data, Indicator, News, On-Chain, and Structure tools.
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
from app.mcp_server.tools.structure_tools import (
    detect_market_structure,
    detect_market_regime,
    calculate_ta_composite_score,
)
from app.mcp_server.tools.liquidity_tools import (
    get_liquidation_clusters,
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
    # Structure & Regime tools
    "detect_market_structure",
    "detect_market_regime",
    "calculate_ta_composite_score",
    # Liquidity tools
    "get_liquidation_clusters",
]

