import React from 'react';
import styles from './SynthesisPanel.module.css';
import useAppStore from '../../store/useAppStore';
import ConfluenceGauge from './ConfluenceGauge';
import {
  ShieldCheck, TrendingUp, TrendingDown, Minus,
  Activity, Globe, Database, AlertTriangle, BarChart2,
  ArrowDownRight, ArrowUpRight, Layers, DollarSign, Target,
  Wallet, TrendingUp as TrendUp, Clock
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

const SentimentIcon = ({ sentiment, size = 20 }) => {
  if (sentiment === 'bullish') return <TrendingUp  className={styles.bullish} size={size} />;
  if (sentiment === 'bearish') return <TrendingDown className={styles.bearish} size={size} />;
  return <Minus className={styles.neutral} size={size} />;
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
  const tp    = toNum(levels.take_profit);
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

  return (
    <div className={styles.sizingCard}>
      <div className={styles.sizingHeader}>
        <DollarSign size={14} />
        <span>Position Sizing</span>
        {direction && direction !== 'neutral' && (
          <span className={`${styles.dirBadgeSmall} ${direction === 'long' ? styles.dirLong : styles.dirShort}`}>
            {direction === 'long' ? '▲ LONG' : '▼ SHORT'}
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
        {tp && (
          <div className={styles.sizingRow}>
            <span className={`${styles.sizingLabel} ${styles.bullish}`}><ArrowUpRight size={11}/> Take Profit</span>
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

// ── Agent Section cards ────────────────────────────────────────────────────

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
      takeProfit: levels.take_profit || '',
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
                      // Normalise keys: LLM may emit stop_loss/take_profit or sl/tp
                      const hypoVal = (side, key) => {
                        const s = riskDetails.hypothetical_scenarios[side];
                        if (!s) return null;
                        return key === 'sl'
                          ? (s.stop_loss ?? s.sl ?? null)
                          : (s.take_profit ?? s.tp ?? null);
                      };
                      const fmtHypo = (v) => (v != null ? fmt(v) : '—');
                      return (
                        <>
                          <div className={styles.hypoColumn}>
                            <span className={styles.hypoTitle}>Hypothetical Long</span>
                            <div className={styles.levelBox}>
                              <ArrowDownRight size={13} className={styles.bearish} />
                              <span className={styles.levelLabel}>SL</span>
                              <span className={styles.levelVal}>{fmtHypo(hypoVal('long', 'sl'))}</span>
                            </div>
                            <div className={styles.levelBox}>
                              <ArrowUpRight size={13} className={styles.bullish} />
                              <span className={styles.levelLabel}>TP</span>
                              <span className={styles.levelVal}>{fmtHypo(hypoVal('long', 'tp'))}</span>
                            </div>
                          </div>
                          <div className={styles.hypoColumn}>
                            <span className={styles.hypoTitle}>Hypothetical Short</span>
                            <div className={styles.levelBox}>
                              <ArrowUpRight size={13} className={styles.bearish} />
                              <span className={styles.levelLabel}>SL</span>
                              <span className={styles.levelVal}>{fmtHypo(hypoVal('short', 'sl'))}</span>
                            </div>
                            <div className={styles.levelBox}>
                              <ArrowDownRight size={13} className={styles.bullish} />
                              <span className={styles.levelLabel}>TP</span>
                              <span className={styles.levelVal}>{fmtHypo(hypoVal('short', 'tp'))}</span>
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
