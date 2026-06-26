from fastapi import APIRouter, HTTPException
from app.schemas.backtest import BacktestRequest, BacktestResponse
from app.services.backtest_engine import BacktestEngine
import traceback

router = APIRouter(prefix="/backtest", tags=["Backtest"])

@router.post(
    "",
    response_model=BacktestResponse,
    summary="Run an algorithmic backtest",
    description="Fetches historical data and simulates AI strategy logic on the timeframe using vector math."
)
async def run_backtest(request: BacktestRequest) -> BacktestResponse:
    engine = BacktestEngine(request)
    try:
        # ccxt fetching is synchronous in our engine setup so we don't need await if run in thread
        # To avoid blocking, we could run in a thread pool but for now direct execution is fast enough
        return engine.run()
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Backtest engine failed: {str(exc)}")
