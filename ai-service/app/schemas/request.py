"""
Request schema for the /analyze endpoint.
"""

from pydantic import BaseModel, Field

# Supported timeframes in ascending order (used for multi-TF validation)
SUPPORTED_TIMEFRAMES = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "12h", "1d", "1w"]

# Timeframe weights for confluence score calculation (must sum to 1.0)
DEFAULT_TIMEFRAME_WEIGHTS = {
    "15m": 0.15,
    "1h": 0.20,
    "4h": 0.35,
    "1d": 0.30,
}


class AnalysisRequest(BaseModel):
    """
    Input payload for triggering a multi-agent analysis.
    Sent by the .NET API when a user requests an analysis.

    When `timeframes` is provided, a Multi-Timeframe Confluence analysis is run
    and `timeframe` is used as the primary/display timeframe.
    When `timeframes` is None, a standard single-timeframe analysis runs.
    """

    symbol: str = Field(..., description="Trading pair, e.g. 'BTC/USDT'", examples=["BTC/USDT"])
    timeframe: str = Field(default="4h", description="Primary candle interval", examples=["15m", "1h", "4h", "1d"])
    timeframes: list[str] | None = Field(
        default=None,
        description="Optional list of timeframes for Multi-Timeframe Confluence analysis. "
                    "When provided, each TF is analyzed independently and scores are weighted. "
                    "Example: ['15m', '1h', '4h', '1d']"
    )
    balance: float = Field(default=1000.0, gt=0, description="User's portfolio balance in quote asset (USDT)")
    risk_percentage: float = Field(default=2.0, gt=0, le=100, description="Risk percentage per trade")
    session_id: str | None = Field(default=None, description="Optional UUID to broadcast live telemetry via Redis Pub/Sub")
    risk_profile: str = Field(default="moderate", description="Trading risk appetite: conservative | moderate | aggressive")
    strategy_config: dict | None = Field(
        default=None,
        description="Optional strategy template configuration injected by the .NET API when a strategy is selected. "
                    "Keys: timeframe_weights (dict), news_weight (float). "
                    "When provided, overrides DEFAULT_TIMEFRAME_WEIGHTS and news scoring weight."
    )
