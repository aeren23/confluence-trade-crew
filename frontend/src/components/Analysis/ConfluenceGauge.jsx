import React from 'react';
import styles from './ConfluenceGauge.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALIGNMENT_COLORS = {
  aligned: '#4ade80',
  mixed: '#fbbf24',
  conflicting: '#f87171',
};

const ALIGNMENT_ICONS = {
  aligned: '✦',
  mixed: '◈',
  conflicting: '⚡',
};

const TF_ORDER = ['1d', '4h', '1h', '15m'];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert a -1.0 to +1.0 score to a gauge sweep angle.
 * Gauge sweeps 180° (from 9 o'clock to 3 o'clock).
 * -1.0 → 0°, 0.0 → 90°, +1.0 → 180°
 */
const scoreToAngle = (score) => ((score + 1) / 2) * 180;

/**
 * Convert polar gauge angle (0°–180°) to SVG (x,y) on a circle of given radius.
 * 0° is at the left (9 o'clock), 180° is at the right (3 o'clock).
 */
const gaugePoint = (angleDeg, r, cx, cy) => {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
};

/**
 * Build an SVG arc path for a gauge segment from startAngle to endAngle.
 */
const arcPath = (startAngle, endAngle, r, cx, cy) => {
  const start = gaugePoint(startAngle, r, cx, cy);
  const end = gaugePoint(endAngle, r, cx, cy);
  const largeArc = endAngle - startAngle > 90 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
};

// ── TF Bar Component ──────────────────────────────────────────────────────────

const TFBar = ({ tf, score, sentiment, confidence, weight }) => {
  const barWidth = Math.abs(score) * 100;
  const isPositive = score >= 0;
  const sentimentColor = sentiment === 'bullish' ? '#4ade80' : sentiment === 'bearish' ? '#f87171' : '#fbbf24';

  return (
    <div className={styles.tfBar}>
      <span className={styles.tfLabel}>{tf}</span>
      <div className={styles.tfTrack}>
        <div className={styles.tfCenter} />
        <div
          className={styles.tfFill}
          style={{
            width: `${barWidth / 2}%`,
            left: isPositive ? '50%' : `${50 - barWidth / 2}%`,
            background: sentimentColor,
          }}
        />
      </div>
      <span className={styles.tfScore} style={{ color: sentimentColor }}>
        {score >= 0 ? '+' : ''}{score.toFixed(2)}
      </span>
      <span className={styles.tfConf}>{(confidence * 100).toFixed(0)}%</span>
    </div>
  );
};

// ── Main Gauge Component ──────────────────────────────────────────────────────

/**
 * Radial half-circle gauge displaying the multi-timeframe confluence score.
 *
 * Props:
 *   confluence: MultiTimeframeConfluence object from the AI response
 */
const ConfluenceGauge = ({ confluence }) => {
  if (!confluence) return null;

  const {
    confluence_score: score,
    confluence_sentiment: sentiment,
    confluence_confidence: confidence,
    alignment,
    per_timeframe: perTF = [],
    news_adjustment: newsAdj = 0,
    timeframes_analyzed: tfList = [],
  } = confluence;

  // SVG gauge geometry
  const cx = 100;
  const cy = 100;
  const outerR = 80;
  const innerR = 56;
  const needleR = 72;

  // Score-to-angle mapping
  const currentAngle = scoreToAngle(score || 0);

  // Gradient zones: red (0°–60°), amber (60°–120°), green (120°–180°)
  const zones = [
    { start: 0, end: 60, color: '#f87171', opacity: 0.7 },
    { start: 60, end: 120, color: '#fbbf24', opacity: 0.7 },
    { start: 120, end: 180, color: '#4ade80', opacity: 0.7 },
  ];

  // Needle tip
  const needle = gaugePoint(currentAngle, needleR, cx, cy);

  const sentimentColor = sentiment === 'bullish' ? '#4ade80' : sentiment === 'bearish' ? '#f87171' : '#fbbf24';
  const alignmentColor = ALIGNMENT_COLORS[alignment] || '#fbbf24';
  const alignmentIcon = ALIGNMENT_ICONS[alignment] || '◈';

  // Sort per-TF by the canonical order
  const sortedTF = [...perTF].sort(
    (a, b) => TF_ORDER.indexOf(b.timeframe) - TF_ORDER.indexOf(a.timeframe)
  );

  return (
    <div className={styles.wrapper}>
      {/* Gauge header */}
      <div className={styles.header}>
        <span className={styles.title}>Confluence Score</span>
        <span className={styles.tfPills}>
          {tfList.map((tf) => (
            <span key={tf} className={styles.tfPill}>{tf}</span>
          ))}
        </span>
      </div>

      <div className={styles.body}>
        {/* SVG Gauge */}
        <div className={styles.svgWrapper}>
          <svg viewBox="0 0 200 110" className={styles.svg}>
            {/* Background track */}
            <path
              d={arcPath(0, 180, outerR, cx, cy)}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={outerR - innerR}
            />

            {/* Colored zones */}
            {zones.map((z) => (
              <path
                key={z.start}
                d={arcPath(z.start, z.end, (outerR + innerR) / 2, cx, cy)}
                fill="none"
                stroke={z.color}
                strokeWidth={outerR - innerR}
                strokeOpacity={z.opacity}
              />
            ))}

            {/* Score fill arc */}
            <path
              d={arcPath(90, currentAngle, (outerR + innerR) / 2, cx, cy)}
              fill="none"
              stroke={sentimentColor}
              strokeWidth={outerR - innerR + 2}
              strokeOpacity={0.25}
            />

            {/* Tick marks */}
            {[0, 45, 90, 135, 180].map((a) => {
              const inner = gaugePoint(a, innerR - 4, cx, cy);
              const outer = gaugePoint(a, outerR + 4, cx, cy);
              return (
                <line
                  key={a}
                  x1={inner.x} y1={inner.y}
                  x2={outer.x} y2={outer.y}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={1}
                />
              );
            })}

            {/* Needle */}
            <line
              x1={cx} y1={cy}
              x2={needle.x} y2={needle.y}
              stroke={sentimentColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <circle cx={cx} cy={cy} r={5} fill={sentimentColor} />

            {/* Center text — score value */}
            <text
              x={cx} y={cy - 12}
              textAnchor="middle"
              fill={sentimentColor}
              fontSize={18}
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              {score >= 0 ? '+' : ''}{(score || 0).toFixed(3)}
            </text>
            <text
              x={cx} y={cy + 4}
              textAnchor="middle"
              fill="rgba(255,255,255,0.55)"
              fontSize={9}
              fontFamily="Inter, sans-serif"
            >
              {sentiment?.toUpperCase()}
            </text>

            {/* Axis labels */}
            <text x={16} y={cy + 6} textAnchor="middle" fill="#f87171" fontSize={9}>-1</text>
            <text x={cx} y={20} textAnchor="middle" fill="#fbbf24" fontSize={9}>0</text>
            <text x={184} y={cy + 6} textAnchor="middle" fill="#4ade80" fontSize={9}>+1</text>
          </svg>
        </div>

        {/* Stats column */}
        <div className={styles.stats}>
          {/* Alignment badge */}
          <div className={styles.alignmentBadge} style={{ borderColor: alignmentColor, color: alignmentColor }}>
            <span className={styles.alignIcon}>{alignmentIcon}</span>
            <span>{alignment?.toUpperCase()}</span>
          </div>

          {/* Confidence */}
          <div className={styles.confRow}>
            <span className={styles.confLabel}>Confidence</span>
            <span className={styles.confVal}>{((confidence || 0) * 100).toFixed(0)}%</span>
          </div>

          {/* News adjustment */}
          {newsAdj !== 0 && (
            <div className={styles.newsAdj}>
              <span className={styles.confLabel}>News Δ</span>
              <span className={styles.confVal} style={{ color: newsAdj > 0 ? '#4ade80' : '#f87171' }}>
                {newsAdj >= 0 ? '+' : ''}{newsAdj.toFixed(3)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Per-TF breakdown */}
      {sortedTF.length > 0 && (
        <div className={styles.breakdown}>
          <div className={styles.breakdownTitle}>Per-Timeframe Breakdown</div>
          {sortedTF.map((tf) => (
            <TFBar
              key={tf.timeframe}
              tf={tf.timeframe}
              score={tf.ta_sentiment_score}
              sentiment={tf.ta_sentiment}
              confidence={tf.ta_confidence}
              weight={tf.weight}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ConfluenceGauge;
