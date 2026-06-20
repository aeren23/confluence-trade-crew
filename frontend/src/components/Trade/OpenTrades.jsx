import React, { useEffect, useState } from 'react';
import styles from './OpenTrades.module.css';
import useAppStore from '../../store/useAppStore';
import { TradeService } from '../../services/apiClient';
import {
  TrendingUp, TrendingDown, X, CheckCircle2, Loader2
} from 'lucide-react';

const fmt = (n, d = 2) => {
  if (n == null) return '—';
  return parseFloat(n).toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};

const TradeRow = ({ trade, onClose, onDelete, closingId }) => {
  const isLong  = trade.direction === 0 || trade.direction === 'Long';
  const pnl     = trade.pnlQuote;
  const pnlPct  = trade.pnlPercentage;
  const isProfit = pnl != null && pnl > 0;
  const isLoss   = pnl != null && pnl < 0;

  return (
    <div className={`${styles.row} ${trade.status === 1 || trade.status === 'Closed' ? styles.rowClosed : ''}`}>
      {/* Direction + Symbol */}
      <div className={styles.rowLeft}>
        <span className={isLong ? styles.long : styles.short}>
          {isLong ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isLong ? 'Long' : 'Short'}
        </span>
        <span className={styles.symbol}>{trade.symbol}</span>
        {trade.leverage && trade.leverage > 1 && (
          <span className={styles.lev}>{trade.leverage}×</span>
        )}
      </div>

      {/* Levels */}
      <div className={styles.rowMid}>
        <span className={styles.levelText}>Entry {fmt(trade.entryPrice)}</span>
        {trade.stopLoss   && <span className={styles.sl}>SL {fmt(trade.stopLoss)}</span>}
        {trade.takeProfit && <span className={styles.tp}>TP {fmt(trade.takeProfit)}</span>}
      </div>

      {/* PnL (only for closed trades) */}
      {pnl != null && (
        <div className={`${styles.pnl} ${isProfit ? styles.profit : isLoss ? styles.loss : ''}`}>
          {isProfit ? '+' : ''}{fmt(pnl)} USDT
          {pnlPct != null && (
            <span className={styles.pnlPct}> ({isProfit ? '+' : ''}{fmt(pnlPct)}%)</span>
          )}
        </div>
      )}

      {/* Actions */}
      {(trade.status === 0 || trade.status === 'Open') && (
        <div className={styles.actions}>
          <button
            className={styles.closeTradeBtn}
            onClick={() => onClose(trade.id, trade.entryPrice)}
            disabled={closingId === trade.id}
            title="Close trade at current price"
          >
            {closingId === trade.id
              ? <Loader2 size={11} className={styles.spin} />
              : <CheckCircle2 size={11} />
            }
            Close
          </button>
          <button
            className={styles.deleteBtn}
            onClick={() => onDelete(trade.id)}
            title="Delete trade"
          >
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
};

const OpenTrades = () => {
  const { openTrades, setOpenTrades, updateOpenTrade, removeOpenTrade } = useAppStore();
  const [closingId, setClosingId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    TradeService.list({ status: 'Open', pageSize: 50 })
      .then((data) => {
        setOpenTrades(data.items || data || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [loaded, setOpenTrades]);

  const handleClose = async (id, entryPrice) => {
    setClosingId(id);
    try {
      const exitPrice = parseFloat(prompt('Exit price:', entryPrice) || entryPrice);
      if (isNaN(exitPrice)) { setClosingId(null); return; }
      const updated = await TradeService.close(id, { exitPrice });
      updateOpenTrade(id, updated);
    } catch {
      // Non-fatal
    } finally {
      setClosingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this trade?')) return;
    try {
      await TradeService.remove(id);
      removeOpenTrade(id);
    } catch {
      // Non-fatal
    }
  };

  const openCount = openTrades.filter(
    (t) => t.status === 0 || t.status === 'Open'
  ).length;

  if (openTrades.length === 0) return null;

  return (
    <div className={`glass-card ${styles.widget}`}>
      <div className={styles.header}>
        <TrendingUp size={14} />
        <span>Open Trades</span>
        {openCount > 0 && <span className={styles.badge}>{openCount}</span>}
      </div>
      <div className={styles.list}>
        {openTrades.map((trade) => (
          <TradeRow
            key={trade.id}
            trade={trade}
            onClose={handleClose}
            onDelete={handleDelete}
            closingId={closingId}
          />
        ))}
      </div>
    </div>
  );
};

export default OpenTrades;
