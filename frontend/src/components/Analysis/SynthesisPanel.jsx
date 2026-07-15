import React from 'react';
import styles from './SynthesisPanel.module.css';
import useAppStore from '../../store/useAppStore';
import ConfluenceGauge from './ConfluenceGauge';
import {
  ShieldCheck, TrendingUp, TrendingDown, Minus,
  Activity, Globe, Database, AlertTriangle, BarChart2,
  ArrowDownRight, ArrowUpRight, Layers, DollarSign, Target,
  Wallet, TrendingUp as TrendUp, Clock, Zap, BarChart, RefreshCw, Crosshair, Droplets
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

const SentimentIcon = ({ sentiment, size = 20 }) => {
  if (sentiment === 'bullish') return <TrendingUp  className={styles.bullish} size={size} />;
  if (sentiment === 'bearish') return <TrendingDown className={styles.bearish} size={size} />;
  return <Minus className={styles.neutral} size={size} />;
};

// ── Trade Mode Banner ───────────────────────────────────────────────────────
const TRADE_MODE_CONFIG = {
  trend: {
    icon: <TrendingUp size={15} />,
    label: 'TREND MODE',
    desc: 'Directional trend detected — follow momentum.',
    cls: styles.tradeModeBanner_trend,
  },
  range: {
    icon: <RefreshCw size={15} />,
    label: 'RANGE MODE',
    desc: 'Market oscillating between support and resistance — mean-reversion setups preferred.',
    cls: styles.tradeModeBanner_range,
  },
  breakout_watch: {
    icon: <Zap size={15} />,
    label: 'BREAKOUT WATCH',
    desc: 'Structure break detected — watch for breakout confirmation before entry.',
    cls: styles.tradeModeBanner_breakout_watch,
  },
};

const TradeModeBanner = ({ mode }) => {
  const cfg = TRADE_MODE_CONFIG[mode];
  if (!cfg) return null;
  return (
    <div className={`${styles.tradeModeBanner} ${cfg.cls}`}>
      {cfg.icon}
      <span className={styles.tradeModeLabel}>{cfg.label}</span>
      <span className={styles.tradeModeDesc}>{cfg.desc}</span>
    </div>
  );
};

// ── Range Trade Card ────────────────────────────────────────────────────────
const RangeTradeCard = ({ rangeTrade, currentPrice }) => {
  if (!rangeTrade) return null;
  const { range_high, range_low, bias, trigger, breakout_alert } = rangeTrade;

  // Current price position within the range (0% = low, 100% = high)
  const rangeSpan = range_high - range_low;
  const pricePct = rangeSpan > 0
    ? Math.min(100, Math.max(0, ((currentPrice - range_low) / rangeSpan) * 100))
    : 50;

  const biasClass =
    bias === 'long_at_support'   ? styles.rangeBiasLong  :
    bias === 'short_at_resistance' ? styles.rangeBiasShort :
    styles.rangeBiasNeutral;

  const biasLabel =
    bias === 'long_at_support'   ? '↑ LONG BIAS'  :
    bias === 'short_at_resistance' ? '↓ SHORT BIAS' :
    '◆ NO EDGE';

  return (
    <div className={styles.rangeCard}>
      <div className={styles.rangeCardHeader}>
        <div className={styles.rangeCardTitle}>
          <BarChart size={15} />
          Range Trade Analysis
        </div>
        <span className={`${styles.rangeBiasTag} ${biasClass}`}>{biasLabel}</span>
      </div>

      {/* Range bar visualizer */}
      <div>
        <div className={styles.rangeBar}>
          <div className={styles.rangeBarFill} />
          <div className={styles.rangePriceMarker} style={{ left: `${pricePct}%` }} />
        </div>
        <div className={styles.rangeLabels}>
          <span className={styles.rangeLevelLow}>Support {fmt(range_low)}</span>
          <span>Price {fmt(currentPrice)}</span>
          <span className={styles.rangeLevelHigh}>Resistance {fmt(range_high)}</span>
        </div>
      </div>

      {/* Trigger */}
      {trigger && <div className={styles.rangeTrigger}>{trigger}</div>}

      {/* Breakout alerts */}
      {breakout_alert && (
        <div className={styles.breakoutAlertRow}>
          <div className={`${styles.breakoutAlertItem} ${styles.breakoutAlertBull}`}>
            <span className={styles.breakoutAlertLabel}>Bullish Breakout Above</span>
            <span className={styles.breakoutAlertValue}>{fmt(breakout_alert.bullish_breakout_above)}</span>
          </div>
          <div className={`${styles.breakoutAlertItem} ${styles.breakoutAlertBear}`}>
            <span className={styles.breakoutAlertLabel}>Bearish Breakdown Below</span>
            <span className={styles.breakoutAlertValue}>{fmt(breakout_alert.bearish_breakdown_below)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Breakout Watch Card (Faz 3/5) ────────────────────────────────────────────
const BreakoutWatchCard = ({ breakoutWatch }) => {
  if (!breakoutWatch) return null;
  const { bos_level, bos_direction, confirmation_above, confirmation_below, invalidation, choch_warning, suggested_alert } = breakoutWatch;

  return (
    <div className={styles.rangeCard}>
      <div className={styles.rangeCardHeader}>
        <div className={styles.rangeCardTitle}>
          <Target size={15} />
          Breakout Alert
        </div>
        <span className={`${styles.rangeBiasTag} ${bos_direction === 'bullish' ? styles.rangeBiasLong : styles.rangeBiasShort}`}>
          {bos_direction === 'bullish' ? '↑ BULLISH BOS' : '↓ BEARISH BOS'}
        </span>
      </div>
      
      <div className={styles.breakoutDetails}>
        <div className={styles.sizingRow}>
          <span className={styles.sizingLabel}>BOS Level</span>
          <span className={styles.sizingVal}>{fmt(bos_level)}</span>
        </div>
        {confirmation_above && (
          <div className={styles.sizingRow}>
            <span className={`${styles.sizingLabel} ${styles.bullish}`}>Confirmation Above</span>
            <span className={styles.sizingVal}>{fmt(confirmation_above)}</span>
          </div>
        )}
        {confirmation_below && (
          <div className={styles.sizingRow}>
            <span className={`${styles.sizingLabel} ${styles.bearish}`}>Confirmation Below</span>
            <span className={styles.sizingVal}>{fmt(confirmation_below)}</span>
          </div>
        )}
        {invalidation && (
          <div className={styles.sizingRow}>
            <span className={styles.sizingLabel}>Invalidation</span>
            <span className={styles.sizingVal}>{fmt(invalidation)}</span>
          </div>
        )}
      </div>

      {choch_warning && (
         <div className={styles.conflictBanner} style={{marginTop: '10px', marginBottom: 0, padding: '8px 12px'}}>
           <AlertTriangle size={14} />
           <span>Character Change (CHoCH) detected — higher risk of fakeout.</span>
         </div>
      )}

      {suggested_alert && <div className={styles.rangeTrigger} style={{marginTop: '8px'}}>{suggested_alert}</div>}
    </div>
  );
};

const ScoreBar = ({ value }) => {
  // value is -1 to +1; map to 0-100% width centred at 50%
  const pct = ((value + 1) / 2) * 100;
  const color = value > 0.2 ? '#4ade80' : value < -0.2 ? '#f87171' : '#fbbf24';
  return (
    <div className={styles.scoreBarTrack}>
      <div className={styles.scoreBarFill} style={{ width: `${pct}%`, background: color }} />
    </div>
  );
};

const ConfidenceBar = ({ value }) => (
  <div className={styles.confBarTrack}>
    <div className={styles.confBarFill} style={{ width: `${(value * 100).toFixed(0)}%` }} />
  </div>
);

const Pill = ({ children, variant = 'default' }) => (
  <span className={`${styles.pill} ${styles[`pill_${variant}`]}`}>{children}</span>
);

// ── Position Sizing Card ────────────────────────────────────────────────────

const fmt = (n, decimals) => {
  if (n == null || n === '') return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '—';
  // Auto-detect decimal places for small prices (e.g. SHIB 0.0000122, PEPE 0.000014)
  if (decimals == null) {
    if (num === 0 || Math.abs(num) >= 1) {
      decimals = 2;
    } else {
      const mag = Math.floor(Math.log10(Math.abs(num)));
      decimals = Math.max(4 - 1 - mag, 2);
    }
  }
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const pctDiff = (entry, target) => {
  if (!entry || !target) return null;
  const diff = ((target - entry) / entry) * 100;
  return diff.toFixed(2);
};

const toNum = (value) => {
  if (value == null || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(num) ? num : null;
};

const parseLeverage = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const match = String(value).match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
};

const PositionSizingCard = ({ riskDetails, meta }) => {
  const sizing  = riskDetails?.position_sizing  || {};
  const leverage = riskDetails?.leverage        || {};
  const levels   = riskDetails?.levels          || {};

  const entry = toNum(levels.entry || levels.entry_reference);
  const sl    = toNum(levels.stop_loss);
  // TP1 (1:1 partial exit) and TP2 (primary target) — Faz 3
  const tp1   = toNum(levels.tp1);
  const tp2   = toNum(levels.tp2 ?? levels.take_profit);
  // Backwards compat: fall back to take_profit if tp2 absent
  const tp    = tp2 ?? toNum(levels.take_profit);
  const rr    = levels.risk_reward_ratio
    ?? sizing.risk_reward_ratio
    ?? (entry && sl && tp ? Math.abs(tp - entry) / Math.abs(entry - sl) : null);

  const balance     = toNum(sizing.balance ?? meta?.requestedBalance);
  const riskPct     = toNum(sizing.risk_percentage ?? meta?.requestedRiskPercentage);
  const riskAmt     = toNum(sizing.risk_amount_usdt) ?? (balance && riskPct ? (balance * riskPct / 100) : null);
  const rawPosUsdt  = toNum(sizing.suggested_position_size_usdt ?? sizing.position_size_usdt);
  const posBase     = toNum(sizing.suggested_position_size_base ?? sizing.position_size_base);
  const levMax      = leverage.capped_maximum ?? leverage.max ?? leverage.suggested_range ?? leverage.recommended_range;
  const levNum      = parseLeverage(levMax);
  const direction   = riskDetails?.position_direction;
  const stopDistancePct = entry && sl ? (Math.abs(entry - sl) / entry) * 100 : null;
  const notionalUsdt = rawPosUsdt ?? (posBase && entry ? posBase * entry : null);
  const marginUsdt   = toNum(sizing.required_margin_usdt)
    ?? (notionalUsdt && levNum ? notionalUsdt / levNum : null);

  if (!balance && !riskAmt && !entry) return null;

  const isHypothetical = direction === 'neutral';

  return (
    <div className={`${styles.sizingCard} ${isHypothetical ? styles.sizingCardDimmed : ''}`}>
      <div className={styles.sizingHeader}>
        <DollarSign size={14} />
        <span>Position Sizing {isHypothetical && <span className={styles.hypotheticalBadge}>HYPOTHETICAL</span>}</span>
        {direction && (
          <span className={`${styles.dirBadgeSmall} ${direction === 'long' ? styles.dirLong : direction === 'short' ? styles.dirShort : styles.dirNeutral}`}>
            {direction === 'long' ? '▲ LONG' : direction === 'short' ? '▼ SHORT' : '◆ WAIT'}
          </span>
        )}
      </div>
      <div className={styles.sizingGrid}>
        {balance != null && (
          <div className={styles.sizingRow}>
            <span className={styles.sizingLabel}><Wallet size={11}/> Portfolio</span>
            <span className={styles.sizingVal}>{fmt(balance)} USDT</span>
          </div>
        )}
        {riskPct != null && (
          <div className={styles.sizingRow}>
            <span className={styles.sizingLabel}><Target size={11}/> Risk / Trade</span>
            <span className={styles.sizingVal}>
              {riskPct}%
              {riskAmt != null && <span className={styles.sizingNote}> = {fmt(riskAmt)} USDT at risk</span>}
            </span>
          </div>
        )}
        {(notionalUsdt || posBase) && (
          <div className={styles.sizingRow}>
            <span className={styles.sizingLabel}><Layers size={11}/> Notional Position</span>
            <span className={styles.sizingVal}>
              {notionalUsdt ? `${fmt(notionalUsdt)} USDT` : '—'}
              {posBase ? <span className={styles.sizingNote}> ({fmt(posBase, 5)} base qty)</span> : null}
            </span>
          </div>
        )}
        {levMax && (
          <div className={styles.sizingRow}>
            <span className={styles.sizingLabel}><TrendUp size={11}/> Leverage</span>
            <span className={styles.sizingVal}>{levMax}×</span>
          </div>
        )}
        {marginUsdt != null && (
          <div className={styles.sizingRow}>
            <span className={styles.sizingLabel}>Required Margin</span>
            <span className={styles.sizingVal}>
              {fmt(marginUsdt)} USDT
              {balance && marginUsdt > balance && (
                <span className={styles.sizingWarn}> exceeds portfolio</span>
              )}
            </span>
          </div>
        )}

        {entry && (
          <div className={`${styles.sizingRow} ${styles.sizingDivider}`}>
            <span className={styles.sizingLabel}>Entry</span>
            <span className={styles.sizingVal}>{fmt(entry)}</span>
          </div>
        )}
        {sl && (
          <div className={styles.sizingRow}>
            <span className={`${styles.sizingLabel} ${styles.bearish}`}><ArrowDownRight size={11}/> Stop Loss</span>
            <span className={styles.sizingVal}>
              {fmt(sl)}
              {entry && <span className={styles.sizingNote}> ({pctDiff(entry, sl)}%)</span>}
            </span>
          </div>
        )}
        {stopDistancePct != null && riskAmt != null && (
          <div className={styles.sizingHint}>
            Notional is derived from risk: {fmt(riskAmt)} USDT / {fmt(stopDistancePct)}% stop distance.
          </div>
        )}
        {/* TP1 — 1:1 partial exit */}
        {tp1 && (
          <div className={styles.sizingRow}>
            <span className={`${styles.sizingLabel} ${styles.bullish}`}>
              <ArrowUpRight size={11}/> TP1 <span className={styles.tp1Tag}>1:1</span>
            </span>
            <span className={styles.sizingVal}>
              {fmt(tp1)}
              {entry && <span className={styles.sizingNote}> ({pctDiff(entry, tp1)}%)</span>}
            </span>
          </div>
        )}
        {/* TP2 — primary target */}
        {tp && (
          <div className={styles.sizingRow}>
            <span className={`${styles.sizingLabel} ${styles.bullish}`}>
              <ArrowUpRight size={11}/> {tp1 ? 'TP2' : 'Take Profit'} <span className={styles.tp2Tag}>primary</span>
            </span>
            <span className={styles.sizingVal}>
              {fmt(tp)}
              {entry && <span className={styles.sizingNote}> ({pctDiff(entry, tp)}%)</span>}
            </span>
          </div>
        )}
        {rr != null && (
          <div className={styles.sizingRow}>
            <span className={styles.sizingLabel}>R:R Ratio</span>
            <span className={`${styles.sizingVal} ${parseFloat(rr) >= 1.5 ? styles.bullish : parseFloat(rr) >= 1.0 ? styles.neutral : styles.bearish}`}>
              {typeof rr === 'number' ? rr.toFixed(2) : rr}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Entry Timing Badge ────────────────────────────────────────────────────────
const ENTRY_TIMING_CONFIG = {
  immediate:             { label: 'ENTER NOW',            variant: 'green',   desc: 'All conditions met — immediate entry.' },
  wait_for_pullback:     { label: 'WAIT — PULLBACK',      variant: 'amber',   desc: 'Price extended. Wait for retracement.' },
  wait_for_confirmation: { label: 'WAIT — CONFIRM',       variant: 'cyan',    desc: 'Structure event. Wait for confirmation.' },
  avoid:                 { label: 'AVOID',                 variant: 'red',     desc: 'No clear edge. Skip this setup.' },
};

const EntryTimingBadge = ({ timing }) => {
  const cfg = ENTRY_TIMING_CONFIG[timing];
  if (!cfg) return null;
  return (
    <div className={styles.entryTimingBox}>
      <Crosshair size={12} />
      <span className={styles.entryTimingLabel}>Entry Timing</span>
      <Pill variant={cfg.variant}>{cfg.label}</Pill>
      <span className={styles.entryTimingDesc}>{cfg.desc}</span>
    </div>
  );
};

// ── Agent Section cards ─────────────────────────────────────────────────────────

const AgentMeta = ({ agentData, label }) => {
  if (!agentData) return null;
  return (
    <div className={styles.agentMeta}>
      <span className={`${styles.sentiment} ${styles[agentData.sentiment]}`}>
        <SentimentIcon sentiment={agentData.sentiment} size={13} />
        {agentData.sentiment}
      </span>
      <div className={styles.miniBar}>
        <span className={styles.miniLabel}>Score</span>
        <ScoreBar value={agentData.sentiment_score} />
        <span className={styles.miniVal}>{agentData.sentiment_score?.toFixed(2)}</span>
      </div>
      <div className={styles.miniBar}>
        <span className={styles.miniLabel}>Confidence</span>
        <ConfidenceBar value={agentData.confidence} />
        <span className={styles.miniVal}>{(agentData.confidence * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
// `injectData` — when provided (from AnalysisDetailPage), the component uses
// it directly and does NOT read from or write to the global store.
const SynthesisPanel = ({ onViewAnalysis, injectData } = {}) => {
  const store = useAppStore();
  const { openTradeForm } = store;

  const finalAnalysis   = injectData || store.finalAnalysis;
  const analysisStatus  = injectData ? 'complete' : store.analysisStatus;

  if (analysisStatus !== 'complete' || !finalAnalysis) return null;

  const { synthesis, agents } = finalAnalysis;
  const meta = finalAnalysis._meta || null;
  const ta   = agents?.technical_analysis;
  const news = agents?.news;
  const risk = agents?.risk;
  const data = agents?.data;
  const ms   = agents?.market_structure;  // Faz 1 — Market Structure Agent

  // Trade mode and range trade (Faz 2 & Faz 3)
  const tradeMode = synthesis?.trade_mode || 'trend';
  const rangeTrade = synthesis?.range_trade || null;
  const breakoutWatch = synthesis?.breakout_watch || null;
  const entryTiming = synthesis?.agent_summaries?.entry_timing
    || taDetails?.entry_timing
    || null;

  // TA detail helpers
  const taDetails     = ta?.details   || {};
  const sr            = taDetails.support_resistance || {};
  const newsDetails   = news?.details || {};
  const headlines     = newsDetails.key_headlines   || [];
  const riskDetails   = risk?.details || {};
  const sizing        = riskDetails.position_sizing || {};
  const leverage      = riskDetails.leverage        || {};
  const levels        = riskDetails.levels          || {};
  const dataDetails   = data?.details || {};

  const handleTakeTrade = () => {
    const direction = riskDetails.position_direction;
    if (direction === 'neutral') return;
    openTradeForm({
      symbol: meta?.symbol || '',
      direction: direction === 'long' ? 'Long' : 'Short',
      entryPrice: levels.entry || levels.entry_reference || '',
      plannedEntryPrice: levels.entry || levels.entry_reference || '',
      stopLoss: levels.stop_loss || '',
      takeProfit: levels.take_profit_1 || levels.take_profit || '',
      takeProfit2: levels.take_profit_2 || levels.take_profit2 || '',
      leverage: leverage.capped_maximum || leverage.recommended_range || 1,
      entryAmount: sizing.suggested_position_size_usdt || sizing.position_size_usdt || '',
      analysisId: meta?.id || null,
    });
  };

  return (
    <div className={`glass-card ${styles.panel}`}>

      {/* ── Analysis metadata bar ─────────────────────────────────────────── */}
      {meta && (
        <div className={styles.metaBar}>
          <span className={styles.metaItem}>
            <Clock size={11}/> {new Date(meta.createdAt).toLocaleString()}
          </span>
          <span className={styles.metaSep}>·</span>
          <span className={styles.metaItem}>{meta.symbol} · {meta.timeframe}</span>
          <span className={styles.metaSep}>·</span>
          <span className={styles.metaItem}>Balance {fmt(meta.requestedBalance)} USDT</span>
          <span className={styles.metaSep}>·</span>
          <span className={styles.metaItem}>Risk {meta.requestedRiskPercentage}%</span>
          {onViewAnalysis && meta.id && (
            <>
              <span className={styles.metaSep}>·</span>
              <button className={styles.metaLinkBtn} onClick={onViewAnalysis}>
                View full analysis →
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Conflict Banner ──────────────────────────────────────────────── */}
      {synthesis.conflicts_detected && (
        <div className={styles.conflictBanner}>
          <AlertTriangle size={15} />
          <span>Conflict detected between Technical and News agents — interpretation requires caution.</span>
        </div>
      )}

      {/* ── Trade Mode Banner (Faz 2) ─────────────────────────────────────── */}
      <TradeModeBanner mode={tradeMode} />

      {/* ── Main Header ──────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.sentimentBox}>
          <SentimentIcon sentiment={synthesis.overall_sentiment} size={28} />
          <h2 className={styles[synthesis.overall_sentiment]}>
            {synthesis.overall_sentiment?.toUpperCase()}
          </h2>
        </div>

        <div className={styles.metricsRow}>
          <div className={styles.metricBox}>
            <span className={styles.metricLabel}>Sentiment Score</span>
            <span className={styles.metricValue}>{synthesis.overall_sentiment_score?.toFixed(2)}</span>
            <ScoreBar value={synthesis.overall_sentiment_score} />
          </div>
          <div className={styles.metricBox}>
            <span className={styles.metricLabel}>Confidence</span>
            <span className={styles.metricValue}>{(synthesis.confidence * 100).toFixed(0)}%</span>
            <ConfidenceBar value={synthesis.confidence} />
          </div>
          {data && (
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Candles</span>
              <span className={styles.metricValue}>{dataDetails.candle_count ?? '—'}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary ──────────────────────────────────────────────────────── */}
      <p className={styles.summary}>{synthesis.summary}</p>

      {/* ── Entry Timing Badge (Faz 3) ────────────────────────────────────── */}
      {entryTiming && <EntryTimingBadge timing={entryTiming} />}

      {/* ── Range Trade Card (Faz 2) — visible when trade_mode = 'range' ─── */}
      {tradeMode === 'range' && rangeTrade && (
        <RangeTradeCard
          rangeTrade={rangeTrade}
          currentPrice={
            parseFloat(data?.details?.latest_price) || 
            parseFloat(risk?.details?.levels?.entry) || 
            0
          }
        />
      )}

      {/* ── Breakout Watch Card (Faz 3/5) ─── */}
      {tradeMode === 'breakout_watch' && breakoutWatch && (
        <BreakoutWatchCard breakoutWatch={breakoutWatch} />
      )}

      {/* ── Multi-Timeframe Confluence Gauge ─────────────────────────────── */}
      {finalAnalysis.multi_timeframe_confluence && (
        <ConfluenceGauge confluence={finalAnalysis.multi_timeframe_confluence} />
      )}

      {/* ── Position Sizing Card + Trade action ─────────────────────────── */}
      {risk && (
        <div className={styles.sizingRow_outer}>
          <PositionSizingCard riskDetails={riskDetails} meta={meta} />
          {riskDetails.position_direction && riskDetails.position_direction !== 'neutral' && (
            <button
              className={`${styles.takeTradBtn} ${riskDetails.position_direction === 'long' ? styles.takeTradLong : styles.takeTradShort}`}
              onClick={handleTakeTrade}
            >
              {riskDetails.position_direction === 'long' ? '▲' : '▼'}
              {' '}Open {riskDetails.position_direction === 'long' ? 'Long' : 'Short'} Trade
            </button>
          )}
        </div>
      )}

      {/* ── Agent Grid ───────────────────────────────────────────────────── */}
      <div className={styles.grid}>

        {/* Market Structure Card (Faz 3) */}
        {ms && (() => {
          const msd = ms.details || {};
          const bos = msd.bos_detected;
          const bosType = msd.bos_type;
          const choch = msd.choch_detected;
          const chochType = msd.choch_type;
          const structureVariant =
            msd.structure === 'bullish' ? 'green' :
            msd.structure === 'bearish' ? 'red' : 'amber';
          const regimeVariant =
            msd.regime === 'trending_up' ? 'green' :
            msd.regime === 'trending_down' ? 'red' :
            msd.regime === 'breakout' ? 'cyan' : 'amber';
          return (
            <div className={styles.agentCard}>
              <h3><Layers size={15} /> Market Structure</h3>
              <AgentMeta agentData={ms} />
              <p className={styles.cardSummary}>{synthesis.agent_summaries?.market_structure}</p>

              <div className={styles.detailGrid}>
                {msd.structure && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailKey}>Structure</span>
                    <Pill variant={structureVariant}>{msd.structure}</Pill>
                  </div>
                )}
                {msd.regime && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailKey}>Regime</span>
                    <Pill variant={regimeVariant}>{msd.regime?.replace('_', ' ')}</Pill>
                  </div>
                )}
                {msd.ema_alignment && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailKey}>EMA Alignment</span>
                    <Pill variant={
                      msd.ema_alignment === 'bullish' ? 'green' :
                      msd.ema_alignment === 'bearish' ? 'red' :
                      msd.ema_alignment === 'recovering' ? 'cyan' :
                      msd.ema_alignment === 'weakening' ? 'amber' : 'default'
                    }>{msd.ema_alignment}</Pill>
                  </div>
                )}
                {msd.adx != null && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailKey}>ADX</span>
                    <span className={styles.detailVal}>{msd.adx}</span>
                  </div>
                )}
              </div>

              {/* BOS / CHoCH Events */}
              {(bos || choch) && (
                <div className={styles.msEventRow}>
                  {bos && (
                    <div className={`${styles.msEvent} ${
                      bosType === 'bullish_bos' ? styles.msEventBull : styles.msEventBear
                    }`}>
                      <Zap size={12} />
                      <span>BOS: {bosType === 'bullish_bos' ? '↑ Bullish' : '↓ Bearish'}</span>
                      {msd.bos_level && <span className={styles.msEventLevel}>{fmt(msd.bos_level)}</span>}
                    </div>
                  )}
                  {choch && (
                    <div className={`${styles.msEvent} ${styles.msEventChoch}`}>
                      <AlertTriangle size={12} />
                      <span>CHoCH: {chochType === 'bullish_choch' ? '↑ Bullish' : '↓ Bearish'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Swing Levels */}
              {(msd.swing_high != null || msd.swing_low != null) && (
                <div className={styles.srRow} style={{ marginTop: '0.5rem' }}>
                  {msd.swing_high != null && (
                    <Pill variant="red">Swing High {fmt(msd.swing_high)}</Pill>
                  )}
                  {msd.swing_low != null && (
                    <Pill variant="green">Swing Low {fmt(msd.swing_low)}</Pill>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Technical Analysis Card */}
        {ta && (
          <div className={styles.agentCard}>
            <h3><BarChart2 size={15} /> Technical Analysis</h3>
            <AgentMeta agentData={ta} />
            <p className={styles.cardSummary}>{synthesis.agent_summaries?.technical_analysis}</p>

            {/* Trend / Momentum / Volatility summary */}
            <div className={styles.detailGrid}>
              {taDetails.trend && (
                <div className={styles.detailItem}>
                  <span className={styles.detailKey}>Trend</span>
                  <Pill variant={taDetails.trend?.includes('bullish') ? 'green' : taDetails.trend?.includes('bearish') ? 'red' : 'amber'}>
                    {taDetails.trend}
                  </Pill>
                </div>
              )}
              {taDetails.momentum && (
                <div className={styles.detailItem}>
                  <span className={styles.detailKey}>Momentum</span>
                  <span className={styles.detailVal}>{taDetails.momentum}</span>
                </div>
              )}
              {taDetails.volatility && (
                <div className={styles.detailItem}>
                  <span className={styles.detailKey}>Volatility</span>
                  <Pill variant={taDetails.volatility === 'high' ? 'red' : taDetails.volatility === 'low' ? 'green' : 'amber'}>
                    {taDetails.volatility}
                  </Pill>
                </div>
              )}
            </div>

            {/* Indicator values table */}
            {taDetails.indicators && (
              <div className={styles.indicatorsTable}>
                <div className={styles.indicatorsHeader}>Indicators</div>
                {taDetails.indicators.rsi && (
                  <div className={styles.indRow}>
                    <span className={styles.indName}>RSI (14)</span>
                    <span className={`${styles.indVal} ${
                      taDetails.indicators.rsi.state === 'overbought' ? styles.bearish :
                      taDetails.indicators.rsi.state === 'oversold'   ? styles.bullish : ''
                    }`}>
                      {taDetails.indicators.rsi.value ?? '—'}
                    </span>
                    <Pill variant={
                      taDetails.indicators.rsi.state === 'overbought' ? 'red' :
                      taDetails.indicators.rsi.state === 'oversold'   ? 'green' : 'amber'
                    }>
                      {taDetails.indicators.rsi.state ?? '—'}
                    </Pill>
                  </div>
                )}
                {taDetails.indicators.macd && (
                  <div className={styles.indRow}>
                    <span className={styles.indName}>MACD</span>
                    <span className={styles.indVal}>
                      {taDetails.indicators.macd.macd_line ?? '—'} / {taDetails.indicators.macd.signal_line ?? '—'}
                    </span>
                    <Pill variant={
                      taDetails.indicators.macd.cross === 'bullish_cross' ? 'green' :
                      taDetails.indicators.macd.cross === 'bearish_cross' ? 'red'   : 'default'
                    }>
                      {taDetails.indicators.macd.cross === 'bullish_cross' ? '↑ Bull Cross' :
                       taDetails.indicators.macd.cross === 'bearish_cross' ? '↓ Bear Cross' : 'No cross'}
                    </Pill>
                  </div>
                )}
                {taDetails.indicators.bollinger && (
                  <div className={styles.indRow}>
                    <span className={styles.indName}>Bollinger</span>
                    <span className={styles.indVal}>
                      U {fmt(taDetails.indicators.bollinger.upper)} / M {fmt(taDetails.indicators.bollinger.middle)} / L {fmt(taDetails.indicators.bollinger.lower)}
                    </span>
                    <Pill variant={
                      taDetails.indicators.bollinger.price_position === 'upper_band' ? 'red'   :
                      taDetails.indicators.bollinger.price_position === 'lower_band' ? 'green' : 'default'
                    }>
                      {taDetails.indicators.bollinger.price_position ?? 'inside'}
                    </Pill>
                  </div>
                )}
                {taDetails.indicators.ema_20 && (
                  <div className={styles.indRow}>
                    <span className={styles.indName}>EMA 20</span>
                    <span className={styles.indVal}>{taDetails.indicators.ema_20.value ?? '—'}</span>
                    <Pill variant={taDetails.indicators.ema_20.price_vs_ema === 'above' ? 'green' : 'red'}>
                      Price {taDetails.indicators.ema_20.price_vs_ema ?? '—'}
                    </Pill>
                  </div>
                )}
                {taDetails.indicators.ema_50 && (
                  <div className={styles.indRow}>
                    <span className={styles.indName}>EMA 50</span>
                    <span className={styles.indVal}>{taDetails.indicators.ema_50.value ?? '—'}</span>
                    <Pill variant={taDetails.indicators.ema_50.price_vs_ema === 'above' ? 'green' : 'red'}>
                      Price {taDetails.indicators.ema_50.price_vs_ema ?? '—'}
                    </Pill>
                  </div>
                )}
                {taDetails.indicators.adx && (
                  <div className={styles.indRow}>
                    <span className={styles.indName}>ADX (14)</span>
                    <span className={styles.indVal}>{taDetails.indicators.adx.value ?? '—'}</span>
                    <Pill variant={
                      taDetails.indicators.adx.trend_strength === 'strong'   ? 'green' :
                      taDetails.indicators.adx.trend_strength === 'moderate' ? 'amber' : 'default'
                    }>
                      {taDetails.indicators.adx.trend_strength ?? '—'}
                    </Pill>
                  </div>
                )}
                {taDetails.indicators.atr && (
                  <div className={styles.indRow}>
                    <span className={styles.indName}>ATR (14)</span>
                    <span className={styles.indVal}>{taDetails.indicators.atr.value ?? '—'}</span>
                    <span className={styles.indNote}>{taDetails.indicators.atr.atr_pct ?? '—'}% of price</span>
                  </div>
                )}
                {/* HTF Alignment Badge */}
                {taDetails.indicators.htf_alignment && taDetails.indicators.htf_alignment !== 'not_available' && (
                  <div className={styles.htfBadge}>
                    <span className={styles.detailKey}>HTF Alignment:</span>
                    <Pill variant={
                      taDetails.indicators.htf_alignment === 'aligned_bullish' ? 'green' :
                      taDetails.indicators.htf_alignment === 'aligned_bearish' ? 'red' :
                      taDetails.indicators.htf_alignment === 'conflicting' ? 'amber' : 'default'
                    }>
                      {taDetails.indicators.htf_alignment.replace('_', ' ').toUpperCase()}
                    </Pill>
                  </div>
                )}
              </div>
            )}

            {/* Support / Resistance levels */}
            {(sr.support?.length > 0 || sr.resistance?.length > 0) && (
              <div className={styles.srRow}>
                {sr.support?.slice(0, 3).map((v, i) => (
                  <Pill key={`s${i}`} variant="green">S {fmt(v)}</Pill>
                ))}
                {sr.resistance?.slice(0, 3).map((v, i) => (
                  <Pill key={`r${i}`} variant="red">R {fmt(v)}</Pill>
                ))}
              </div>
            )}
            {/* Divergences (Faz 5) */}
            {taDetails.divergences && taDetails.divergences.length > 0 && (
              <div className={styles.divergenceRow}>
                <span className={styles.indicatorsHeader}>Divergences</span>
                {taDetails.divergences.map((d, i) => {
                  const isBull = typeof d === 'string'
                    ? d.toLowerCase().includes('bull')
                    : d?.type?.includes('bull');
                  const label = typeof d === 'string' ? d : (d?.description ?? d?.type ?? JSON.stringify(d));
                  return (
                    <div key={i} className={`${styles.divergenceItem} ${isBull ? styles.bullish : styles.bearish}`}>
                      {isBull ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* News / Macro Card */}
        {news && (
          <div className={styles.agentCard}>
            <h3><Globe size={15} /> Macro &amp; News</h3>
            <AgentMeta agentData={news} />
            <p className={styles.cardSummary}>{synthesis.agent_summaries?.news}</p>

            {newsDetails.macro_environment && (
              <div className={styles.macroBox}>
                <span className={styles.detailKey}>Macro environment</span>
                <span className={styles.detailVal}>{newsDetails.macro_environment}</span>
              </div>
            )}

            {headlines.length > 0 && (
              <ul className={styles.headlines}>
                {headlines.slice(0, 4).map((h, i) => {
                  const title    = typeof h === 'string' ? h : h?.title ?? JSON.stringify(h);
                  const sentiment = typeof h === 'object' ? h?.sentiment : null;
                  const impact    = typeof h === 'object' ? h?.impact    : null;
                  return (
                    <li key={i}>
                      <span>{title}</span>
                      {(sentiment || impact) && (
                        <span className={styles.headlineMeta}>
                          {sentiment && <span className={`${styles.hTag} ${styles[sentiment]}`}>{sentiment}</span>}
                          {impact    && <span className={styles.hTag}>{impact}</span>}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* On-Chain / Derivatives Card */}
        {agents?.onchain && (() => {
          const onchain = agents.onchain;
          const od = onchain.details || {};
          const squeezeSeverity = {
            EXTREME: 'red', HIGH: 'red', MEDIUM: 'amber', LOW: 'green', NONE: 'default',
          };
          const fundingSentColors = {
            extreme_greed: 'red', greed: 'amber', neutral: 'default', fear: 'cyan', extreme_fear: 'cyan',
          };
          return (
            <div className={styles.agentCard}>
              <h3>⛓️ On-Chain &amp; Derivatives</h3>
              <AgentMeta agentData={onchain} />
              <p className={styles.cardSummary}>{synthesis?.agent_summaries?.onchain}</p>

              {/* Funding Rate */}
              {od.funding_rate_pct != null && (
                <div className={styles.onchainRow}>
                  <span className={styles.detailKey}>Funding Rate</span>
                  <span className={styles.detailVal}>
                    {od.funding_rate_pct >= 0 ? '+' : ''}{Number(od.funding_rate_pct).toFixed(4)}%
                  </span>
                  {od.funding_sentiment && (
                    <Pill variant={fundingSentColors[od.funding_sentiment] || 'default'}>
                      {od.funding_sentiment.replace('_', ' ')}
                    </Pill>
                  )}
                </div>
              )}

              {/* Crowd Positioning */}
              {od.long_pct != null && (
                <div className={styles.onchainRow}>
                  <span className={styles.detailKey}>Crowd Longs</span>
                  <span className={styles.detailVal}>{Number(od.long_pct).toFixed(1)}%</span>
                  {od.retail_sentiment && (
                    <Pill variant={
                      od.retail_sentiment === 'overleveraged_long' ? 'red' :
                      od.retail_sentiment === 'overleveraged_short' ? 'cyan' : 'default'
                    }>
                      {od.retail_sentiment.replace(/_/g, ' ')}
                    </Pill>
                  )}
                </div>
              )}

              {/* OI Trend */}
              {od.oi_trend && (
                <div className={styles.onchainRow}>
                  <span className={styles.detailKey}>Open Interest</span>
                  <Pill variant={
                    od.oi_trend === 'increasing' ? 'green' :
                    od.oi_trend === 'decreasing' ? 'red' : 'default'
                  }>
                    {od.oi_trend}
                  </Pill>
                </div>
              )}

              {/* Squeeze Risk */}
              {od.squeeze_risk && od.squeeze_risk !== 'NONE' && (
                <div className={styles.onchainRow}>
                  <span className={styles.detailKey}>Squeeze Risk</span>
                  <Pill variant={squeezeSeverity[od.squeeze_risk] || 'default'}>
                    {od.squeeze_risk}
                  </Pill>
                </div>
              )}

              {/* Warnings */}
              {od.warnings && od.warnings.length > 0 && (
                <div className={styles.onchainWarnings}>
                  {od.warnings.map((w, i) => (
                    <div key={i} className={styles.onchainWarning}>
                      <AlertTriangle size={12} className={styles.bearish} />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Liquidity Agent Card */}
        {agents?.liquidity && (() => {
          const liquidity = agents.liquidity;
          const ld = liquidity.details || {};
          return (
            <div className={styles.agentCard}>
              <h3><Droplets size={15} /> Liquidity &amp; Order Flow</h3>
              <AgentMeta agentData={liquidity} />
              <p className={styles.cardSummary}>{synthesis?.agent_summaries?.liquidity}</p>

              {ld.pool_bias && (
                <div className={styles.onchainRow}>
                  <span className={styles.detailKey}>Pool Bias</span>
                  <Pill variant={
                    ld.pool_bias === 'upside_heavy' ? 'cyan' :
                    ld.pool_bias === 'downside_heavy' ? 'amber' : 'default'
                  }>
                    {ld.pool_bias.replace('_', ' ').toUpperCase()}
                  </Pill>
                </div>
              )}

              {ld.draw_target && (
                <div className={styles.onchainRow}>
                  <span className={styles.detailKey}>Draw Target</span>
                  <Pill variant={
                    ld.draw_target === 'up' ? 'green' :
                    ld.draw_target === 'down' ? 'red' : 'default'
                  }>
                    {ld.draw_target.toUpperCase()}
                  </Pill>
                </div>
              )}

              <div className={styles.srRow} style={{ marginTop: '0.5rem' }}>
                {ld.upside_pool_closest != null && (
                  <Pill variant="cyan">Up Pool {fmt(ld.upside_pool_closest)}</Pill>
                )}
                {ld.downside_pool_closest != null && (
                  <Pill variant="amber">Down Pool {fmt(ld.downside_pool_closest)}</Pill>
                )}
              </div>
            </div>
          );
        })()}

        {/* Risk & Sizing Card */}
        {risk && (
          <div className={styles.agentCard}>
            <h3><ShieldCheck size={15} /> Risk &amp; Sizing</h3>
            <AgentMeta agentData={risk} />
            <p className={styles.cardSummary}>{synthesis.agent_summaries?.risk}</p>

            {/* Trade direction badge — most important field */}
            {riskDetails.position_direction && (
              <div className={styles.directionBox}>
                <span className={styles.detailKey}>Trade Direction</span>
                <div className={styles.directionRight}>
                  <span className={`${styles.directionBadge} ${
                    riskDetails.position_direction === 'long'  ? styles.dirLong  :
                    riskDetails.position_direction === 'short' ? styles.dirShort : styles.dirNeutral
                  }`}>
                    {riskDetails.position_direction === 'long'    ? '▲ LONG'    :
                     riskDetails.position_direction === 'short'   ? '▼ SHORT'   : '◆ WAIT'}
                  </span>
                  {riskDetails.position_direction === 'neutral' && (
                    <span className={styles.directionHint}>No clear edge — avoid opening position</span>
                  )}
                </div>
              </div>
            )}

            <div className={styles.detailGrid}>
              {(leverage.capped_maximum || leverage.recommended_range) && (
                <div className={styles.detailItem}>
                  <span className={styles.detailKey}>Max Leverage</span>
                  <Pill variant="cyan">
                    {leverage.capped_maximum ?? leverage.recommended_range}×
                  </Pill>
                </div>
              )}
              {sizing.position_size_units && (
                <div className={styles.detailItem}>
                  <span className={styles.detailKey}>Position Units</span>
                  <span className={styles.detailVal}>{sizing.position_size_units}</span>
                </div>
              )}
              {sizing.risk_reward_ratio && (
                <div className={styles.detailItem}>
                  <span className={styles.detailKey}>R/R Ratio</span>
                  <span className={styles.detailVal}>{sizing.risk_reward_ratio}</span>
                </div>
              )}
            </div>

            <div className={styles.levelRow}>
              {/* If direction is long or short, display the primary levels */}
              {riskDetails.position_direction !== 'neutral' ? (
                <>
                  {(levels.stop_loss || levels.nearest_support) && (
                    <div className={styles.levelBox}>
                      <ArrowDownRight size={13} className={styles.bearish} />
                      <span className={styles.levelLabel}>Stop Loss</span>
                      <span className={styles.levelVal}>
                        {levels.stop_loss ?? levels.nearest_support}
                      </span>
                    </div>
                  )}
                  {(levels.take_profit || levels.nearest_resistance) && (
                    <div className={styles.levelBox}>
                      <ArrowUpRight size={13} className={styles.bullish} />
                      <span className={styles.levelLabel}>Take Profit</span>
                      <span className={styles.levelVal}>
                        {levels.take_profit ?? levels.nearest_resistance}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                /* If direction is neutral, display hypothetical levels if available */
                riskDetails.hypothetical_scenarios && (
                  <div className={styles.hypotheticalGrid}>
                    {(() => {
                      // Normalise keys: LLM may emit stop_loss/take_profit or sl/tp/tp1/tp2
                      const hypoSl  = (side) => {
                        const s = riskDetails.hypothetical_scenarios[side];
                        return s ? (s.stop_loss ?? s.sl ?? null) : null;
                      };
                      const hypoTp1 = (side) => {
                        const s = riskDetails.hypothetical_scenarios[side];
                        return s ? toNum(s.tp1) : null;
                      };
                      const hypoTp2 = (side) => {
                        const s = riskDetails.hypothetical_scenarios[side];
                        return s ? toNum(s.tp2 ?? s.take_profit ?? s.tp) : null;
                      };
                      const fmtHypo = (v) => (v != null ? fmt(v) : '—');
                      return (
                        <>
                          <div className={styles.hypoColumn}>
                            <span className={styles.hypoTitle}>Hypothetical Long</span>
                            <div className={styles.levelBox}>
                              <ArrowDownRight size={13} className={styles.bearish} />
                              <span className={styles.levelLabel}>SL</span>
                              <span className={styles.levelVal}>{fmtHypo(hypoSl('long'))}</span>
                            </div>
                            {hypoTp1('long') && (
                              <div className={styles.levelBox}>
                                <ArrowUpRight size={13} className={styles.bullish} />
                                <span className={styles.levelLabel}>
                                  TP1 <span className={styles.tp1Tag}>1:1</span>
                                </span>
                                <span className={styles.levelVal}>{fmtHypo(hypoTp1('long'))}</span>
                              </div>
                            )}
                            <div className={styles.levelBox}>
                              <ArrowUpRight size={13} className={styles.bullish} />
                              <span className={styles.levelLabel}>
                                {hypoTp1('long') ? <>TP2 <span className={styles.tp2Tag}>primary</span></> : 'TP'}
                              </span>
                              <span className={styles.levelVal}>{fmtHypo(hypoTp2('long'))}</span>
                            </div>
                          </div>
                          <div className={styles.hypoColumn}>
                            <span className={styles.hypoTitle}>Hypothetical Short</span>
                            <div className={styles.levelBox}>
                              <ArrowUpRight size={13} className={styles.bearish} />
                              <span className={styles.levelLabel}>SL</span>
                              <span className={styles.levelVal}>{fmtHypo(hypoSl('short'))}</span>
                            </div>
                            {hypoTp1('short') && (
                              <div className={styles.levelBox}>
                                <ArrowDownRight size={13} className={styles.bullish} />
                                <span className={styles.levelLabel}>
                                  TP1 <span className={styles.tp1Tag}>1:1</span>
                                </span>
                                <span className={styles.levelVal}>{fmtHypo(hypoTp1('short'))}</span>
                              </div>
                            )}
                            <div className={styles.levelBox}>
                              <ArrowDownRight size={13} className={styles.bullish} />
                              <span className={styles.levelLabel}>
                                {hypoTp1('short') ? <>TP2 <span className={styles.tp2Tag}>primary</span></> : 'TP'}
                              </span>
                              <span className={styles.levelVal}>{fmtHypo(hypoTp2('short'))}</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )
              )}
            </div>
          </div>
        )}

      </div>{/* /grid */}

    </div>
  );
};

export default SynthesisPanel;
