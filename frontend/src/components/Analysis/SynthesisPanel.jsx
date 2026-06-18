import React from 'react';
import styles from './SynthesisPanel.module.css';
import useAppStore from '../../store/useAppStore';
import {
  ShieldCheck, TrendingUp, TrendingDown, Minus,
  Activity, Globe, Database, AlertTriangle, BarChart2,
  ArrowDownRight, ArrowUpRight, Layers
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
const SynthesisPanel = () => {
  const { finalAnalysis, analysisStatus } = useAppStore();

  if (analysisStatus !== 'complete' || !finalAnalysis) return null;

  const { synthesis, agents } = finalAnalysis;
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

  return (
    <div className={`glass-card ${styles.panel}`}>

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
                      {taDetails.indicators.bollinger.lower ?? '—'} / {taDetails.indicators.bollinger.middle ?? '—'} / {taDetails.indicators.bollinger.upper ?? '—'}
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
                  <Pill key={`s${i}`} variant="green">S {typeof v === 'number' ? v.toFixed(2) : v}</Pill>
                ))}
                {sr.resistance?.slice(0, 3).map((v, i) => (
                  <Pill key={`r${i}`} variant="red">R {typeof v === 'number' ? v.toFixed(2) : v}</Pill>
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
                  <span className={styles.detailKey}>Position Size</span>
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
                    <div className={styles.hypoColumn}>
                      <span className={styles.hypoTitle}>Hypothetical Long</span>
                      <div className={styles.levelBox}>
                        <ArrowDownRight size={13} className={styles.bearish} />
                        <span className={styles.levelLabel}>SL</span>
                        <span className={styles.levelVal}>{riskDetails.hypothetical_scenarios.long?.stop_loss}</span>
                      </div>
                      <div className={styles.levelBox}>
                        <ArrowUpRight size={13} className={styles.bullish} />
                        <span className={styles.levelLabel}>TP</span>
                        <span className={styles.levelVal}>{riskDetails.hypothetical_scenarios.long?.take_profit}</span>
                      </div>
                    </div>
                    <div className={styles.hypoColumn}>
                      <span className={styles.hypoTitle}>Hypothetical Short</span>
                      <div className={styles.levelBox}>
                        <ArrowUpRight size={13} className={styles.bearish} />
                        <span className={styles.levelLabel}>SL</span>
                        <span className={styles.levelVal}>{riskDetails.hypothetical_scenarios.short?.stop_loss}</span>
                      </div>
                      <div className={styles.levelBox}>
                        <ArrowDownRight size={13} className={styles.bullish} />
                        <span className={styles.levelLabel}>TP</span>
                        <span className={styles.levelVal}>{riskDetails.hypothetical_scenarios.short?.take_profit}</span>
                      </div>
                    </div>
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
