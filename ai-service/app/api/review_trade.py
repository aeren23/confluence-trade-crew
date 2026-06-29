from fastapi import APIRouter, HTTPException
from app.schemas.trade_review import TradeReviewRequest, TradeReviewResponse
from app.services.trade_review_engine import TradeReviewEngine
import traceback

router = APIRouter(prefix="/review-trade", tags=["Trade Review"])

@router.post(
    "",
    response_model=TradeReviewResponse,
    summary="Review a closed trade",
    description="Uses LLM to evaluate execution quality, plan adherence, and timing."
)
async def review_trade(request: TradeReviewRequest) -> TradeReviewResponse:
    engine = TradeReviewEngine(request)
    try:
        # LLM call is synchronous in the engine, but fast enough for a single call.
        return engine.run()
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Trade review failed: {str(exc)}")
