import React from 'react';
import { createChart } from 'lightweight-charts';
import styles from './BacktestDashboard.module.css';
import { TrendingUp, TrendingDown, Target, Activity, DollarSign } from 'lucide-react';

const BacktestDashboard = ({ result }) => {
  const chartContainerRef = React.useRef(null);
  const chartRef = React.useRef(null);

  React.useEffect(() => {
    if (!chartContainerRef.current || !result) return;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#374151', style: 1 },
        horzLines: { color: '#374151', style: 1 },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
    });

    const lineSeries = chartRef.current.addLineSeries({
      color: '#10b981',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#fff',
      crosshairMarkerBackgroundColor: '#10b981',
    });

    if (result.equity_curve && result.equity_curve.length > 0) {
      const data = result.equity_curve.map(point => ({
        time: new Date(point.time).getTime() / 1000,
        value: point.value
      }));
      lineSeries.setData(data);
      
      // Color red if ending in loss
      if (data[data.length - 1].value < data[0].value) {
        lineSeries.applyOptions({ color: '#ef4444', crosshairMarkerBackgroundColor: '#ef4444' });
      }
    }

    chartRef.current.timeScale().fitContent();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [result]);

  if (!result) return null;

  return (
    <div className={styles.dashboard}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <DollarSign size={16} className={styles.icon} />
            <span>Net Profit</span>
          </div>
          <div className={`${styles.statValue} ${result.total_pnl >= 0 ? styles.textGreen : styles.textRed}`}>
            ${result.total_pnl.toFixed(2)}
          </div>
          <div className={styles.statSub}>
            {result.total_pnl_percentage >= 0 ? '+' : ''}{result.total_pnl_percentage.toFixed(2)}%
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Target size={16} className={styles.icon} />
            <span>Win Rate</span>
          </div>
          <div className={styles.statValue}>
            {result.win_rate.toFixed(1)}%
          </div>
          <div className={styles.statSub}>
            from {result.total_trades} trades
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Activity size={16} className={styles.icon} />
            <span>Max Drawdown</span>
          </div>
          <div className={styles.statValue}>
            {result.max_drawdown.toFixed(2)}%
          </div>
          <div className={styles.statSub}>
            Peak to trough
          </div>
        </div>

        {result.total_fees_paid !== undefined && (
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <DollarSign size={16} className={styles.icon} />
              <span>Total Fees Paid</span>
            </div>
            <div className={`${styles.statValue} ${styles.textRed}`}>
              ${result.total_fees_paid.toFixed(2)}
            </div>
            <div className={styles.statSub}>
              Deducted from PnL
            </div>
          </div>
        )}
      </div>

      <div className={styles.chartSection}>
        <h3 className={styles.sectionTitle}>Equity Curve</h3>
        <div ref={chartContainerRef} className={styles.chartContainer} />
      </div>

      <div className={styles.tradesSection}>
        <h3 className={styles.sectionTitle}>Simulated Trades</h3>
        {result.trades && result.trades.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Lev.</th>
                  <th>Entry</th>
                  <th>SL / TP</th>
                  <th>Exit</th>
                  <th>Fees</th>
                  <th>Net PnL</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.trades.map((trade, idx) => (
                  <tr key={idx}>
                    <td>
                      <div>{new Date(trade.entry_time).toLocaleString()}</div>
                      <div className={styles.textMuted}>{trade.exit_time ? new Date(trade.exit_time).toLocaleString() : '-'}</div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${trade.direction === 'long' ? styles.bgGreen : styles.bgRed}`}>
                        {trade.direction.toUpperCase()}
                      </span>
                    </td>
                    <td>{trade.leverage ? `${trade.leverage.toFixed(1)}x` : '-'}</td>
                    <td>${trade.entry_price.toFixed(2)}</td>
                    <td className={styles.slTpCol}>
                      <div className={styles.textRed}>SL: ${trade.stop_loss.toFixed(2)}</div>
                      <div className={styles.textGreen}>TP: ${trade.take_profit.toFixed(2)}</div>
                    </td>
                    <td>${trade.exit_price ? trade.exit_price.toFixed(2) : '-'}</td>
                    <td className={styles.textRed}>${trade.fees_paid ? trade.fees_paid.toFixed(2) : '0.00'}</td>
                    <td className={trade.pnl >= 0 ? styles.textGreen : styles.textRed}>
                      ${trade.pnl.toFixed(2)}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${trade.status === 'won' ? styles.bgGreen : styles.bgRed}`}>
                        {trade.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.noTrades}>No trades matched the criteria during this period.</div>
        )}
      </div>
    </div>
  );
};

export default BacktestDashboard;
