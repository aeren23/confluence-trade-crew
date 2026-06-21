"""
Response schemas for the /analyze endpoint.

Matches the output envelope defined in agents.md and the
synthesis schema in architecture.md § 3.3.
"""

from pydantic import BaseModel, Field


class AgentOutput(BaseModel):
    """Standard output envelope for each agent (except Orchestrator)."""

    agent: str = Field(..., description="Agent identifier: data, technical_analysis, news, risk")
    sentiment: str = Field(..., description="bullish, bearish, or neutral")
    sentiment_score: float = Field(..., ge=-1.0, le=1.0, description="Sentiment score from -1.0 to +1.0")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Agent's confidence in its output")
    summary: str = Field(..., description="Human-readable 1-2 sentence summary")
    details: dict = Field(default_factory=dict, description="Agent-specific detailed output")


class Annotation(BaseModel):
    """Chart annotation for frontend rendering."""

    type: str = Field(..., description="horizontal_line or marker")
    label: str = Field(..., description="Display label for the annotation")
    value: float | None = Field(default=None, description="Price level (for horizontal_line)")
    style: str = Field(..., description="Rendering style: support, resistance, stop_loss, take_profit, divergence_bullish, divergence_bearish")
    indicator: str | None = Field(default=None, description="Related indicator name (for marker type)")


class SynthesisOutput(BaseModel):
    """Final synthesis produced by the Orchestrator agent."""

    overall_sentiment: str = Field(..., description="bullish, bearish, or neutral")
    overall_sentiment_score: float = Field(..., ge=-1.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    conflicts_detected: bool = Field(default=False, description="True if TA and News agents conflict")
    summary: str = Field(..., description="Comprehensive human-readable synthesis")
    agent_summaries: dict[str, str] = Field(default_factory=dict, description="Per-agent summary strings")


# ── Multi-Timeframe Confluence schemas ────────────────────────────────────────

class TimeframeResult(BaseModel):
    """Per-timeframe TA result used in multi-timeframe confluence calculation."""

    timeframe: str = Field(..., description="Timeframe identifier, e.g. '4h'")
    ta_sentiment: str = Field(..., description="bullish, bearish, or neutral")
    ta_sentiment_score: float = Field(..., ge=-1.0, le=1.0, description="Raw TA sentiment score")
    ta_confidence: float = Field(..., ge=0.0, le=1.0, description="TA agent confidence for this timeframe")
    weight: float = Field(..., ge=0.0, le=1.0, description="Configured weight for this timeframe in confluence score")
    weighted_score: float = Field(
        ...,
        description="ta_sentiment_score × weight × ta_confidence — this TF's contribution to confluence score"
    )
    key_indicators: dict = Field(
        default_factory=dict,
        description="Brief indicator snapshot: RSI value/state, trend direction, EMA crossover"
    )


class MultiTimeframeConfluence(BaseModel):
    """
    Confluence score derived from multiple timeframe analyses.

    Score ranges from -1.0 (full bearish confluence) to +1.0 (full bullish confluence).
    Alignment describes how consistent the timeframes are with each other.
    """

    timeframes_analyzed: list[str] = Field(..., description="List of timeframes that were analyzed")
    confluence_score: float = Field(..., ge=-1.0, le=1.0, description="Weighted confluence score across all timeframes")
    confluence_sentiment: str = Field(..., description="bullish if > 0.25, bearish if < -0.25, neutral otherwise")
    confluence_confidence: float = Field(..., ge=0.0, le=1.0, description="Weighted average confidence across timeframes")
    alignment: str = Field(
        ...,
        description="aligned (all TFs agree) | mixed (some disagree) | conflicting (TFs strongly oppose)"
    )
    per_timeframe: list[TimeframeResult] = Field(..., description="Individual TA results per timeframe")
    news_adjustment: float = Field(
        default=0.0,
        description="News sentiment score adjustment applied to final confluence score (news agent runs once, shared across all TF)"
    )


# ── Top-level analysis response ───────────────────────────────────────────────

class AnalysisResponse(BaseModel):
    """Full response from the /analyze endpoint."""

    symbol: str
    timestamp: str
    agents: dict[str, AgentOutput] = Field(
        default_factory=dict,
        description="Individual agent outputs keyed by agent name"
    )
    synthesis: SynthesisOutput
    annotations: list[Annotation] = Field(
        default_factory=list,
        description="Chart annotations for frontend rendering"
    )
    multi_timeframe_confluence: MultiTimeframeConfluence | None = Field(
        default=None,
        description="Multi-timeframe confluence data, present only when multiple timeframes were requested"
    )
