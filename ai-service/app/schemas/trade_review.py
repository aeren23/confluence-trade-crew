from pydantic import BaseModel, Field

class TradeReviewRequest(BaseModel):
    trade_id: str = Field(..., description="Trade UUID")
    symbol: str = Field(..., description="Trading pair, e.g. 'BTC/USDT'")
    direction: str = Field(..., description="'Long' or 'Short'")
    entry_price: float
    exit_price: float
    stop_loss: float | None
    take_profit: float | None
    leverage: float
    entry_at: str
    exit_at: str | None
    pnl_quote: float | None
    pnl_percentage: float | None
    tags: str | None
    notes: str | None
    analysis_result_json: str | None = Field(None, description="Original AI analysis at trade entry time")

class TradeReviewResponse(BaseModel):
    verdict: str = Field(..., description="'good', 'fair', or 'poor'")
    execution_score: float = Field(..., ge=0.0, le=1.0, description="0.0 to 1.0 execution quality score")
    plan_adherence: bool = Field(..., description="Did the trade follow the original AI plan?")
    plan_adherence_explanation: str = Field(..., description="Explanation of plan adherence")
    sl_tp_rational: bool = Field(..., description="Were the SL and TP levels technically rational?")
    sl_tp_analysis: str = Field(..., description="Analysis of the SL and TP levels")
    timing_verdict: str = Field(..., description="'early_exit', 'late_exit', or 'optimal'")
    timing_explanation: str = Field(..., description="Explanation of the exit timing")
    improvement_advice: str = Field(..., description="Advice for future trades with similar setups")
