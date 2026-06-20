"""
Request schema for the /analyze endpoint.
"""

from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    """
    Input payload for triggering a multi-agent analysis.
    Sent by the .NET API when a user requests an analysis.
    """

    symbol: str = Field(..., description="Trading pair, e.g. 'BTC/USDT'", examples=["BTC/USDT"])
    timeframe: str = Field(default="4h", description="Candle interval", examples=["15m", "1h", "4h", "1d"])
    balance: float = Field(default=1000.0, gt=0, description="User's portfolio balance in quote asset (USDT)")
    risk_percentage: float = Field(default=2.0, gt=0, le=100, description="Risk percentage per trade")
    session_id: str | None = Field(default=None, description="Optional UUID to broadcast live telemetry via Redis Pub/Sub")
    risk_profile: str = Field(default="moderate", description="Trading risk appetite: conservative | moderate | aggressive")
