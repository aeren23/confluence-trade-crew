from typing import List, Optional
from pydantic import BaseModel, Field

class BacktestRequest(BaseModel):
    symbol: str = Field(..., description="Trading pair, e.g. 'BTC/USDT'")
    timeframe: str = Field(default="1h", description="Candle interval")
    start_date: str = Field(..., description="ISO 8601 start date")
    end_date: str = Field(..., description="ISO 8601 end date")
    initial_balance: float = Field(default=1000.0, description="Starting portfolio balance")
    risk_percentage: float = Field(default=2.0, description="Risk per trade %")
    strategy_config: Optional[dict] = Field(default=None, description="Strategy weights and minimum RR")
    max_trades: Optional[int] = Field(default=None, description="Maximum number of trades to simulate")
    trading_fee_percentage: float = Field(default=0.0, description="Maker/Taker fee percentage per trade leg")

class BacktestTrade(BaseModel):
    entry_time: str
    exit_time: Optional[str]
    direction: str
    entry_price: float
    exit_price: Optional[float]
    stop_loss: float
    take_profit: float
    leverage: float
    status: str  # "won", "lost", "open"
    pnl: float
    pnl_percentage: float
    fees_paid: float
    balance_after: float

class BacktestResponse(BaseModel):
    symbol: str
    timeframe: str
    start_date: str
    end_date: str
    initial_balance: float
    final_balance: float
    total_pnl: float
    total_pnl_percentage: float
    total_fees_paid: float
    win_rate: float
    total_trades: int
    max_drawdown: float
    trades: List[BacktestTrade]
    equity_curve: List[dict]  # [{"time": "...", "value": float}]
