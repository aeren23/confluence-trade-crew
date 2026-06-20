import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './PortfolioPage.module.css';
import { PortfolioService, TradeService } from '../services/apiClient';
import { TrendingUp, TrendingDown, Activity, Target, Loader2, ArrowRight } from 'lucide-react';

const fmt = (n, d = 2) => {
  if (n == null) return '—';
  return parseFloat(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
};

const StatCard = ({ icon, label, value, sub, colorClass }) => (
  <div className={styles.statCard}>
    <div className={styles.statIcon}>{icon}</div>
    <div className={styles.statBody}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${colorClass || ''}`}>{value}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  </div>
);

const PortfolioPage = () => {
  const [summary,       setSummary]       = useState(null);
  const [recentTrades,  setRecentTrades]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  useEffect(() => {
    Promise.all([
      PortfolioService.getSummary(),
      TradeService.list({ status: 'Closed', page: 1, pageSize: 8 }),
    ])
      .then(([sum, trades]) => {
        setSummary(sum);
        setRecentTrades(trades.items || trades || []);
      })
      .catch(() => setError('Failed to load portfolio data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.centered}>
        <Loader2 size={24} className={styles.spin} /> Loading portfolio...
      </div>
    );
  }

  if (error) {
    return <div className={styles.errorBanner}>{error}</div>;
  }

  const netPnl    = summary?.totalPnlQuote ?? 0;
  const winRate   = summary?.winRate ?? 0;
  const isProfit  = netPnl > 0;
  const isLoss    = netPnl < 0;

  return (
    <div className={styles.page}>
      {/* Stats row */}
      <div className={styles.statsGrid}>
        <StatCard
          icon={<Activity size={18} />}
          label="Total Trades"
          value={summary?.totalTrades ?? '—'}
          sub={`${summary?.openTrades ?? 0} open · ${summary?.closedTrades ?? 0} closed`}
        />
        <StatCard
          icon={<Target size={18} />}
          label="Win Rate"
          value={`${fmt(winRate)}%`}
          sub={`${summary?.winCount ?? 0}W / ${summary?.lossCount ?? 0}L`}
          colorClass={winRate >= 50 ? styles.green : styles.red}
        />
        <StatCard
          icon={isProfit ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          label="Net PnL"
          value={`${isProfit ? '+' : ''}${fmt(netPnl)} USDT`}
          sub={`${isProfit ? '+' : ''}${fmt(summary?.totalPnlPercentage)}%`}
          colorClass={isProfit ? styles.green : isLoss ? styles.red : ''}
        />
        <StatCard
          icon={<Activity size={18} />}
          label="Open Positions"
          value={summary?.openTrades ?? '—'}
        />
      </div>

      {/* Recent closed trades */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Recent Closed Trades</h3>
          <Link to="/trades?tab=closed" className={styles.seeAll}>
            See all <ArrowRight size={12} />
          </Link>
        </div>

        {recentTrades.length === 0 ? (
          <div className={styles.empty}>No closed trades yet.</div>
        ) : (
          <div className={styles.tradeList}>
            {recentTrades.map(t => {
              const isLong  = t.direction === 0 || t.direction === 'Long';
              const pnl     = t.pnlQuote;
              const profit  = pnl != null && pnl > 0;
              const loss    = pnl != null && pnl < 0;
              return (
                <div key={t.id} className={styles.tradeRow}>
                  <span className={isLong ? styles.long : styles.short}>
                    {isLong ? '▲ Long' : '▼ Short'}
                  </span>
                  <span className={styles.tradeSymbol}>{t.symbol}</span>
                  <span className={styles.tradeEntry}>{fmt(t.entryPrice)} → {fmt(t.exitPrice)}</span>
                  <span className={`${styles.tradePnl} ${profit ? styles.green : loss ? styles.red : ''}`}>
                    {pnl != null ? `${profit ? '+' : ''}${fmt(pnl)} USDT` : '—'}
                  </span>
                  {t.analysisId && (
                    <Link to={`/analysis/${t.analysisId}`} className={styles.analysisLink} title="View linked analysis">
                      Analysis →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioPage;
