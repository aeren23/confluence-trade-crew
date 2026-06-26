import ccxt
import pandas as pd
import pandas_ta as ta
from datetime import datetime, timezone
import math

from app.schemas.backtest import BacktestRequest, BacktestResponse, BacktestTrade
from app.config import settings

class BacktestEngine:
    def __init__(self, request: BacktestRequest):
        self.request = request
        self.balance = request.initial_balance
        self.equity_curve = [{"time": request.start_date, "value": self.balance}]
        self.trades = []
        self.total_fees_paid = 0.0
        self.max_balance = self.balance
        self.max_drawdown = 0.0
        
        # Load strategy config
        self.config = request.strategy_config or {}
        self.min_rr = float(self.config.get("minimumRR", 1.5))
        
        # Initialize exchange
        exchange_config = {"enableRateLimit": True}
        if settings.binance_api_key:
            exchange_config["apiKey"] = settings.binance_api_key
            exchange_config["secret"] = settings.binance_api_secret

        import os
        proxy_url = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
        if proxy_url:
            exchange_config["proxies"] = {"http": proxy_url, "https": proxy_url}

        self.exchange = ccxt.binance(exchange_config)

    def fetch_data(self) -> pd.DataFrame:
        start_ms = self.exchange.parse8601(self.request.start_date)
        end_ms = self.exchange.parse8601(self.request.end_date)
        
        all_ohlcv = []
        current_ms = start_ms
        limit = 1000
        
        # Fetch data in chunks until end_ms
        while current_ms < end_ms:
            ohlcv = self.exchange.fetch_ohlcv(
                self.request.symbol, 
                self.request.timeframe, 
                since=current_ms, 
                limit=limit
            )
            if not ohlcv:
                break
            
            # Filter out items past end_ms
            valid_ohlcv = [row for row in ohlcv if row[0] <= end_ms]
            all_ohlcv.extend(valid_ohlcv)
            
            last_ts = ohlcv[-1][0]
            if last_ts >= end_ms or len(ohlcv) < limit:
                break
                
            current_ms = last_ts + 1  # Next candle
            
        if not all_ohlcv:
            return pd.DataFrame()
            
        df = pd.DataFrame(all_ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])
        df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
        return df

    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        # We need RSI, MACD, Bollinger Bands, EMA 20, EMA 50, ATR
        df["rsi"] = ta.rsi(df["close"], length=14)
        
        macd = ta.macd(df["close"], fast=12, slow=26, signal=9)
        if macd is not None and not macd.empty:
            df["macd_hist"] = macd.iloc[:, 1]
        else:
            df["macd_hist"] = 0.0
            
        bb = ta.bbands(df["close"], length=20, std=2)
        if bb is not None and not bb.empty:
            df["bb_lower"] = bb.iloc[:, 0]
            df["bb_upper"] = bb.iloc[:, 2]
        else:
            df["bb_lower"] = df["close"] * 0.95
            df["bb_upper"] = df["close"] * 1.05
            
        df["ema_20"] = ta.ema(df["close"], length=20)
        df["ema_50"] = ta.ema(df["close"], length=50)
        df["atr"] = ta.atr(df["high"], df["low"], df["close"], length=14)
        
        # Drop rows with NaN due to indicator lookback periods
        df.dropna(inplace=True)
        df.reset_index(drop=True, inplace=True)
        return df

    def run(self) -> BacktestResponse:
        df = self.fetch_data()
        if df.empty:
            raise ValueError("No data returned for the specified date range.")
            
        df = self.calculate_indicators(df)
        
        open_trade = None
        
        for i, row in df.iterrows():
            current_time = row["timestamp"].isoformat()
            close_price = float(row["close"])
            high_price = float(row["high"])
            low_price = float(row["low"])
            
            # 1. Update max balance for drawdown
            if self.balance > self.max_balance:
                self.max_balance = self.balance
            drawdown = (self.max_balance - self.balance) / self.max_balance if self.max_balance > 0 else 0
            if drawdown > self.max_drawdown:
                self.max_drawdown = drawdown
                
            # 2. Manage Open Trade
            if open_trade:
                hit_sl = False
                hit_tp = False
                exit_price = 0.0
                
                if open_trade["direction"] == "long":
                    if low_price <= open_trade["stop_loss"]:
                        hit_sl = True
                        exit_price = open_trade["stop_loss"]
                    elif high_price >= open_trade["take_profit"]:
                        hit_tp = True
                        exit_price = open_trade["take_profit"]
                else:  # short
                    if high_price >= open_trade["stop_loss"]:
                        hit_sl = True
                        exit_price = open_trade["stop_loss"]
                    elif low_price <= open_trade["take_profit"]:
                        hit_tp = True
                        exit_price = open_trade["take_profit"]
                
                if hit_sl or hit_tp:
                    # Calculate PnL
                    entry_price = open_trade["entry_price"]
                    risk_amount = open_trade["risk_amount"]
                    # Position size logic: risk_amount is lost if SL hits.
                    sl_dist_pct = abs(open_trade["stop_loss"] - entry_price) / entry_price
                    pos_size = risk_amount / sl_dist_pct if sl_dist_pct > 0 else 0
                    
                    if open_trade["direction"] == "long":
                        pnl = (exit_price - entry_price) / entry_price * pos_size
                    else:
                        pnl = (entry_price - exit_price) / entry_price * pos_size
                        
                    # Calculate Fees
                    # Trade size = pos_size / margin ? Actually, pos_size is the margin. The total traded volume is pos_size * leverage.
                    # Wait, our pos_size calculation is:
                    # pos_size = risk_amount / sl_dist_pct
                    # This pos_size is exactly the "Total Position Value" (Hacim).
                    # Commission is paid on Entry and Exit volume.
                    # Total volume = entry_pos_size + exit_pos_size
                    # exit_pos_size = pos_size + pnl
                    entry_volume = pos_size
                    exit_volume = pos_size + pnl
                    fee_pct = self.request.trading_fee_percentage / 100.0
                    trade_fee = (entry_volume * fee_pct) + (exit_volume * fee_pct)
                    
                    self.total_fees_paid += trade_fee
                    pnl_after_fee = pnl - trade_fee
                        
                    self.balance += pnl_after_fee
                    self.equity_curve.append({"time": current_time, "value": self.balance})
                    
                    trade_record = BacktestTrade(
                        entry_time=open_trade["entry_time"],
                        exit_time=current_time,
                        direction=open_trade["direction"],
                        entry_price=entry_price,
                        exit_price=exit_price,
                        stop_loss=open_trade["stop_loss"],
                        take_profit=open_trade["take_profit"],
                        leverage=open_trade["leverage"],
                        status="won" if pnl_after_fee > 0 else "lost",
                        pnl=pnl_after_fee,
                        pnl_percentage=(pnl_after_fee / self.balance)*100,
                        fees_paid=trade_fee,
                        balance_after=self.balance
                    )
                    self.trades.append(trade_record)
                    open_trade = None
                    continue  # Wait for next candle to open a new trade

            # Check max trades limit
            if self.request.max_trades and len(self.trades) >= self.request.max_trades:
                break

            # 3. Evaluate AI Synthesis Logic if no open trade
            if not open_trade:
                # Simulating Orchestrator Rules (simplified vectorized logic)
                # News is assumed 0.0. TA logic:
                rsi = float(row["rsi"])
                macd_hist = float(row["macd_hist"])
                ema20 = float(row["ema_20"])
                ema50 = float(row["ema_50"])
                atr = float(row["atr"])
                
                ta_score = 0.0
                
                # Bullish conditions
                if rsi < 40: ta_score += 0.3
                if rsi > 50 and rsi < 70: ta_score += 0.2
                if macd_hist > 0: ta_score += 0.3
                if close_price > ema20: ta_score += 0.2
                if ema20 > ema50: ta_score += 0.3
                
                # Bearish conditions
                if rsi > 60: ta_score -= 0.3
                if rsi < 50 and rsi > 30: ta_score -= 0.2
                if macd_hist < 0: ta_score -= 0.3
                if close_price < ema20: ta_score -= 0.2
                if ema20 < ema50: ta_score -= 0.3
                
                direction = "neutral"
                if ta_score > 0.4:
                    direction = "long"
                elif ta_score < -0.4:
                    direction = "short"
                    
                # Setup trade if signal
                if direction != "neutral" and atr > 0:
                    entry_price = close_price
                    sl_dist = atr * 1.5
                    tp_dist = sl_dist * self.min_rr
                    
                    sl = entry_price - sl_dist if direction == "long" else entry_price + sl_dist
                    tp = entry_price + tp_dist if direction == "long" else entry_price - tp_dist
                    
                    # Ensure positive price
                    if sl <= 0 or tp <= 0: continue
                    
                    # Leverage calculation
                    sl_dist_pct = abs(entry_price - sl) / entry_price
                    risk_amount = self.balance * (self.request.risk_percentage / 100.0)
                    pos_size = risk_amount / sl_dist_pct if sl_dist_pct > 0 else 0
                    leverage = pos_size / risk_amount if risk_amount > 0 else 1.0
                    
                    open_trade = {
                        "direction": direction,
                        "entry_time": current_time,
                        "entry_price": entry_price,
                        "stop_loss": sl,
                        "take_profit": tp,
                        "pos_size": pos_size,
                        "leverage": leverage
                    }
                    
        # Calculate final metrics
        total_pnl = self.balance - self.request.initial_balance
        pnl_pct = (total_pnl / self.request.initial_balance) * 100
        wins = len([t for t in self.trades if t.status == "won"])
        win_rate = (wins / len(self.trades)) * 100 if self.trades else 0
        
        return BacktestResponse(
            symbol=self.request.symbol,
            timeframe=self.request.timeframe,
            start_date=self.request.start_date,
            end_date=self.request.end_date,
            initial_balance=self.request.initial_balance,
            final_balance=round(self.balance, 2),
            total_pnl=round(total_pnl, 2),
            total_pnl_percentage=round(pnl_pct, 2),
            total_fees_paid=round(self.total_fees_paid, 2),
            win_rate=round(win_rate, 2),
            total_trades=len(self.trades),
            max_drawdown=round(self.max_drawdown * 100, 2),
            trades=self.trades,
            equity_curve=self.equity_curve
        )
