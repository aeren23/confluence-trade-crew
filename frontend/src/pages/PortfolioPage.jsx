import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import styles from './PortfolioPage.module.css';
import { PortfolioService, TradeService, AccuracyService } from '../services/apiClient';
import {
  TrendingUp, TrendingDown, Activity, Target, Loader2,
  ArrowRight, Award, AlertTriangle, Clock, BarChart2
} from 'lucide-react';

const fmt = (n, d = 2) => {
  if (n == null) return '—';
  return parseFloat(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
};

const fmtH = (h) => {
  if (h == null) return '—';
  const hours = parseFloat(h);
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
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

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MonthlyBreakdown = ({ data }) => {
  if (!data || data.length === 0) return <div className={styles.empty}>No monthly data yet.</div>;
  const max = Math.max(...data.map(d => Math.abs(d.pnl)));
  return (
    <div className={styles.monthlyGrid}>
      {data.map((m) => {
        const pct = max > 0 ? Math.abs(m.pnl) / max : 0;
        const isPos = m.pnl >= 0;
        return (
          <div key={`${m.year}-${m.month}`} className={styles.monthCell}>
            <div className={styles.monthLabel}>{MONTH_NAMES[m.month - 1]} {m.year}</div>
            <div
              className={`${styles.monthBar} ${isPos ? styles.monthBarGreen : styles.monthBarRed}`}
              style={{ width: `${Math.max(pct * 100, 4)}%` }}
            />
            <div className={`${styles.monthPnl} ${isPos ? styles.green : styles.red}`}>
              {isPos ? '+' : ''}{fmt(m.pnl)}
            </div>
            <div className={styles.monthMeta}>{m.tradeCount} trades · {m.winCount}W</div>
          </div>
        );
      })}
    </div>
  );
};

const BreakdownList = ({ data, mode }) => {
  if (!data || data.length === 0) return <div className={styles.empty}>No {mode} data yet.</div>;
  const max = Math.max(...data.map(d => Math.abs(d.pnl)));
  return (
    <div className={styles.monthlyGrid}>
      {data.map((item) => {
        const key = mode === 'weekly'
          ? `${item.year}-W${item.week}`
          : new Date(item.date).toISOString().slice(0, 10);
        const label = mode === 'weekly'
          ? `W${item.week} ${item.year}`
          : new Date(item.date).toLocaleDateString();
        const pct = max > 0 ? Math.abs(item.pnl) / max : 0;
        const isPos = item.pnl >= 0;
        return (
          <div key={key} className={styles.monthCell}>
            <div className={styles.monthLabel}>{label}</div>
            <div
              className={`${styles.monthBar} ${isPos ? styles.monthBarGreen : styles.monthBarRed}`}
              style={{ width: `${Math.max(pct * 100, 4)}%` }}
            />
            <div className={`${styles.monthPnl} ${isPos ? styles.green : styles.red}`}>
              {isPos ? '+' : ''}{fmt(item.pnl)}
            </div>
            <div className={styles.monthMeta}>{item.tradeCount} trades · {item.winCount}W</div>
          </div>
        );
      })}
    </div>
  );
};

const CalendarHeatmap = ({ data }) => {
  if (!data || data.length === 0) return <div className={styles.empty}>No daily data for heatmap yet.</div>;
  const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  const maxAbs = Math.max(...sorted.map(d => Math.abs(d.pnl)));
  return (
    <div className={styles.heatmapGrid}>
      {sorted.slice(-120).map((day) => {
        const pnl = day.pnl ?? 0;
        const intensity = maxAbs > 0 ? Math.min(Math.abs(pnl) / maxAbs, 1) : 0;
        const cls = pnl > 0 ? styles.heatGreen : pnl < 0 ? styles.heatRed : styles.heatNeutral;
        return (
          <div
            key={day.date}
            className={`${styles.heatCell} ${cls}`}
            style={{ opacity: 0.28 + intensity * 0.72 }}
            title={`${new Date(day.date).toLocaleDateString()}: ${pnl >= 0 ? '+' : ''}${fmt(pnl)} USDT · ${day.tradeCount} trades`}
          />
        );
      })}
    </div>
  );
};

const EquityCurveChart = ({ data }) => {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout:     { background: { color: 'transparent' }, textColor: '#888' },
      grid:       { vertLines: { color: '#2a2a2a' }, horzLines: { color: '#2a2a2a' } },
      crosshair:  { mode: 0 },
      rightPriceScale: { borderColor: '#444' },
      timeScale:  { borderColor: '#444', timeVisible: true },
      height: 200,
    });
    chartRef.current = chart;

    const series = chart.addLineSeries({
      color: data[data.length - 1]?.cumulativePnl >= 0 ? '#4ade80' : '#f87171',
      lineWidth: 2,
      priceLineVisible: false,
    });

    const chartData = data.map((pt) => ({
      time: Math.floor(new Date(pt.date).getTime() / 1000),
      value: pt.cumulativePnl,
    }));
    series.setData(chartData);
    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, [data]);

  if (!data || data.length === 0)
    return <div className={styles.empty}>No equity curve data yet.</div>;

  return <div ref={containerRef} className={styles.equityChart} />;
};

const PortfolioPage = () => {
  const [summary,       setSummary]       = useState(null);
  const [recentTrades,  setRecentTrades]  = useState([]);
  const [accuracyStats, setAccuracyStats] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [breakdownView, setBreakdownView] = useState('monthly');

  useEffect(() => {
    Promise.all([
      PortfolioService.getSummary(),
      TradeService.list({ status: 'Closed', page: 1, pageSize: 8 }),
      AccuracyService.getGlobalStats().catch(() => null)
    ])
      .then(([sum, trades, accuracy]) => {
        setSummary(sum);
        setRecentTrades(trades.items || trades || []);
        setAccuracyStats(accuracy);
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

  const netPnl   = summary?.totalPnlQuote ?? 0;
  const winRate  = summary?.winRate ?? 0;
  const isProfit = netPnl > 0;
  const isLoss   = netPnl < 0;

  return (
    <div className={styles.page}>
      {/* ── Core stats ──────────────────────────────────────────────────── */}
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

      {/* ── Advanced metrics ────────────────────────────────────────────── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Advanced Metrics</h3>
        <div className={styles.advancedGrid}>
          {accuracyStats && (
            <StatCard
              icon={<Target size={16} />}
              label="AI Model Accuracy"
              value={`${accuracyStats.winRate}%`}
              sub={`${accuracyStats.totalEvaluated} predictions evaluated`}
              colorClass={accuracyStats.winRate >= 50 ? styles.green : styles.red}
            />
          )}
          <StatCard
            icon={<BarChart2 size={16} />}
            label="Avg Risk/Reward"
            value={`${fmt(summary?.avgRiskReward)}R`}
          />
          <StatCard
            icon={<Target size={16} />}
            label="Expectancy / Trade"
            value={`${(summary?.expectancy ?? 0) >= 0 ? '+' : ''}${fmt(summary?.expectancy)} USDT`}
            sub="Avg expected PnL"
            colorClass={(summary?.expectancy ?? 0) >= 0 ? styles.green : styles.red}
          />
          <StatCard
            icon={<AlertTriangle size={16} />}
            label="Max Drawdown"
            value={`-${fmt(summary?.maxDrawdown)} USDT`}
            colorClass={styles.red}
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Recovery Factor"
            value={fmt(summary?.recoveryFactor)}
          />
          <StatCard
            icon={<Clock size={16} />}
            label="Avg Hold Duration"
            value={fmtH(summary?.avgHoldDurationHours)}
          />
          <StatCard
            icon={<Award size={16} />}
            label="Win Streak"
            value={`${summary?.longestWinStreak ?? 0} trades`}
            sub={`Loss streak: ${summary?.longestLossStreak ?? 0}`}
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Best Symbol"
            value={summary?.bestSymbol ?? '—'}
            colorClass={styles.green}
          />
          <StatCard
            icon={<TrendingDown size={16} />}
            label="Worst Symbol"
            value={summary?.worstSymbol ?? '—'}
            colorClass={styles.red}
          />
          <StatCard
            icon={<Award size={16} />}
            label="Best Trade"
            value={summary?.bestTradePnl != null ? `+${fmt(summary.bestTradePnl)} USDT` : '—'}
            sub={summary?.bestTradeSymbol ?? ''}
            colorClass={styles.green}
          />
          <StatCard
            icon={<AlertTriangle size={16} />}
            label="Worst Trade"
            value={summary?.worstTradePnl != null ? `${fmt(summary.worstTradePnl)} USDT` : '—'}
            sub={summary?.worstTradeSymbol ?? ''}
            colorClass={styles.red}
          />
          <StatCard
            icon={<BarChart2 size={16} />}
            label="Profit Factor"
            value={fmt(summary?.profitFactor)}
          />
          <StatCard
            icon={<BarChart2 size={16} />}
            label="Sharpe / Sortino"
            value={`${fmt(summary?.sharpeRatio)} / ${fmt(summary?.sortinoRatio)}`}
          />
          <StatCard
            icon={<AlertTriangle size={16} />}
            label="Risk of Ruin"
            value={`${fmt(summary?.riskOfRuin)}%`}
            colorClass={(summary?.riskOfRuin ?? 0) > 25 ? styles.red : styles.green}
          />
        </div>
      </div>

      {/* ── Equity Curve ─────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Equity Curve</h3>
        <EquityCurveChart data={summary?.equityCurve} />
      </div>

      {/* ── PnL Breakdown ────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>PnL Breakdown</h3>
          <div className={styles.viewToggle}>
            {['monthly', 'weekly', 'daily'].map((view) => (
              <button
                key={view}
                className={`${styles.viewToggleBtn} ${breakdownView === view ? styles.viewToggleBtnActive : ''}`}
                onClick={() => setBreakdownView(view)}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
        {breakdownView === 'monthly' && <MonthlyBreakdown data={summary?.monthlyBreakdown} />}
        {breakdownView === 'weekly' && <BreakdownList data={summary?.weeklyBreakdown} mode="weekly" />}
        {breakdownView === 'daily' && <BreakdownList data={summary?.dailyBreakdown} mode="daily" />}
      </div>

      {/* ── Calendar Heatmap ─────────────────────────────────────────────── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Daily PnL Heatmap</h3>
        <CalendarHeatmap data={summary?.dailyBreakdown} />
      </div>

      {/* ── Recent closed trades ─────────────────────────────────────────── */}
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
