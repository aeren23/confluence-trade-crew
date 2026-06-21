import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import styles from './TradingChart.module.css';
import useAppStore from '../../store/useAppStore';
import { useBinanceData } from '../../hooks/useBinanceData';
import { Loader2, AlertTriangle, Wifi } from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// Indicator maths (all operate on arrays of {time, value} or plain arrays)
// ────────────────────────────────────────────────────────────────────────────

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  const result = [];
  let prev = null;
  for (let i = 0; i < closes.length; i++) {
    if (prev === null) {
      if (i < period - 1) { result.push(null); continue; }
      // seed with SMA
      const seed = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
      prev = seed;
      result.push(seed);
    } else {
      prev = closes[i] * k + prev * (1 - k);
      result.push(prev);
    }
  }
  return result;
}

function calcBollinger(closes, period = 20, mult = 2) {
  const upper = [], middle = [], lower = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(null); middle.push(null); lower.push(null); continue; }
    const slice = closes.slice(i - period + 1, i + 1);
    const sma   = slice.reduce((a, b) => a + b, 0) / period;
    const std   = Math.sqrt(slice.reduce((a, b) => a + (b - sma) ** 2, 0) / period);
    upper.push(sma + mult * std);
    middle.push(sma);
    lower.push(sma - mult * std);
  }
  return { upper, middle, lower };
}

function calcRSI(closes, period = 14) {
  const result = [];
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period && i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = 0; i < period; i++) result.push(null);
  if (closes.length > period) {
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast   = calcEMA(closes, fast);
  const emaSlow   = calcEMA(closes, slow);
  const macdLine  = emaFast.map((f, i) => (f != null && emaSlow[i] != null) ? f - emaSlow[i] : null);

  // Signal = EMA(signal) of macdLine values
  const macdValid = macdLine.filter(v => v !== null);
  const sigEMA    = calcEMA(macdValid, signal);

  const sigFull = new Array(macdLine.length).fill(null);
  let j = 0;
  macdLine.forEach((v, i) => {
    if (v !== null) { sigFull[i] = sigEMA[j]; j++; }
  });

  const histogram = macdLine.map((m, i) =>
    m != null && sigFull[i] != null ? m - sigFull[i] : null
  );

  return { macdLine, signalLine: sigFull, histogram };
}

// ────────────────────────────────────────────────────────────────────────────
// Shared chart options factory
// ────────────────────────────────────────────────────────────────────────────

function makeChartOptions(height = 200) {
  return {
    layout: {
      background: { type: 'solid', color: 'transparent' },
      textColor: '#a1a1aa',
    },
    grid: {
      vertLines: { color: 'rgba(255,255,255,0.05)' },
      horzLines: { color: 'rgba(255,255,255,0.05)' },
    },
    crosshair: { mode: 1 },
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
    timeScale: { visible: false, borderColor: 'rgba(255,255,255,0.1)' },
    height,
    handleScroll: false,
    handleScale:  false,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

const INDICATOR_OPTS = ['EMA', 'BB', 'RSI', 'MACD'];

const TradingChart = () => {
  const mainRef   = useRef(null);
  const rsiRef    = useRef(null);
  const macdRef   = useRef(null);

  // Chart + series refs
  const chartMainRef   = useRef(null);
  const csRef          = useRef(null);          // candlestick
  const ema20Ref       = useRef(null);
  const ema50Ref       = useRef(null);
  const bbUpperRef     = useRef(null);
  const bbMiddleRef    = useRef(null);
  const bbLowerRef     = useRef(null);
  const chartRsiRef    = useRef(null);
  const rsiSeriesRef   = useRef(null);
  const rsiOBRef       = useRef(null);
  const rsiOSRef       = useRef(null);
  const chartMacdRef   = useRef(null);
  const macdLineRef    = useRef(null);
  const macdSigRef     = useRef(null);
  const macdHistRef    = useRef(null);

  const priceLinesRef  = useRef([]);

  const { symbol, timeframe, finalAnalysis } = useAppStore();
  const { data, loading, error, isMockData } = useBinanceData(symbol, timeframe);

  const [activeIndicators, setActiveIndicators] = useState(['EMA', 'BB', 'RSI', 'MACD']);

  const showEMA  = activeIndicators.includes('EMA');
  const showBB   = activeIndicators.includes('BB');
  const showRSI  = activeIndicators.includes('RSI');
  const showMACD = activeIndicators.includes('MACD');

  const toggleIndicator = (name) => {
    setActiveIndicators(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  // ── Main chart init ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!mainRef.current) return;

    const chart = createChart(mainRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#a1a1aa',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.05)' },
        horzLines: { color: 'rgba(255,255,255,0.05)' },
      },
      crosshair: { mode: 1 },
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    const cs = chart.addCandlestickSeries({
      upColor: '#4ade80', downColor: '#f87171',
      borderVisible: false,
      wickUpColor: '#4ade80', wickDownColor: '#f87171',
    });

    // EMA lines
    const ema20 = chart.addLineSeries({ color: '#facc15', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const ema50 = chart.addLineSeries({ color: '#fb923c', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

    // Bollinger bands
    const bbU = chart.addLineSeries({ color: 'rgba(147,197,253,0.5)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, lineStyle: 2 });
    const bbM = chart.addLineSeries({ color: 'rgba(147,197,253,0.3)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, lineStyle: 2 });
    const bbL = chart.addLineSeries({ color: 'rgba(147,197,253,0.5)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, lineStyle: 2 });

    chartMainRef.current = chart;
    csRef.current        = cs;
    ema20Ref.current     = ema20;
    ema50Ref.current     = ema50;
    bbUpperRef.current   = bbU;
    bbMiddleRef.current  = bbM;
    bbLowerRef.current   = bbL;

    const handleResize = () => {
      if (mainRef.current) chart.applyOptions({ width: mainRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // ── RSI sub-chart init ──────────────────────────────────────────────────

  useEffect(() => {
    if (!showRSI || !rsiRef.current) return;

    const chart = createChart(rsiRef.current, { ...makeChartOptions(120) });

    const rsiSeries = chart.addLineSeries({ color: '#c084fc', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
    const obLine    = chart.addLineSeries({ color: 'rgba(248,113,113,0.4)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, lineStyle: 2 });
    const osLine    = chart.addLineSeries({ color: 'rgba(74,222,128,0.4)',  lineWidth: 1, priceLineVisible: false, lastValueVisible: false, lineStyle: 2 });

    chartRsiRef.current  = chart;
    rsiSeriesRef.current = rsiSeries;
    rsiOBRef.current     = obLine;
    rsiOSRef.current     = osLine;

    const handleResize = () => {
      if (rsiRef.current) chart.applyOptions({ width: rsiRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRsiRef.current  = null;
      rsiSeriesRef.current = null;
      rsiOBRef.current     = null;
      rsiOSRef.current     = null;
    };
  }, [showRSI]);

  // ── MACD sub-chart init ─────────────────────────────────────────────────

  useEffect(() => {
    if (!showMACD || !macdRef.current) return;

    const chart = createChart(macdRef.current, {
      ...makeChartOptions(120),
      timeScale: { visible: true, timeVisible: true, secondsVisible: false, borderColor: 'rgba(255,255,255,0.1)' },
    });

    const macdLine = chart.addLineSeries({ color: '#60a5fa', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
    const sigLine  = chart.addLineSeries({ color: '#f97316', lineWidth: 1,   priceLineVisible: false, lastValueVisible: true });
    const hist     = chart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });

    chartMacdRef.current = chart;
    macdLineRef.current  = macdLine;
    macdSigRef.current   = sigLine;
    macdHistRef.current  = hist;

    const handleResize = () => {
      if (macdRef.current) chart.applyOptions({ width: macdRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartMacdRef.current = null;
      macdLineRef.current  = null;
      macdSigRef.current   = null;
      macdHistRef.current  = null;
    };
  }, [showMACD]);

  // ── Sync timescales across all sub-charts ───────────────────────────────

  useEffect(() => {
    const charts = [chartMainRef.current, chartRsiRef.current, chartMacdRef.current].filter(Boolean);
    if (charts.length < 2) return;

    const handlers = charts.map((chart, idx) => {
      const handler = (range) => {
        if (!range) return;
        charts.forEach((c, j) => { if (j !== idx) c.timeScale().setVisibleLogicalRange(range); });
      };
      chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
      return { chart, handler };
    });

    return () => {
      handlers.forEach(({ chart, handler }) => {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
      });
    };
  }, [showRSI, showMACD]);

  // ── Update candles + indicators when data changes ───────────────────────

  useEffect(() => {
    if (!data.length || !csRef.current) return;

    csRef.current.setData(data);
    chartMainRef.current?.timeScale().fitContent();

    const closes = data.map(d => d.close);
    const times  = data.map(d => d.time);

    const toSeries = (values) =>
      values.map((v, i) => v != null ? { time: times[i], value: v } : null).filter(Boolean);

    // EMA
    const ema20vals = calcEMA(closes, 20);
    const ema50vals = calcEMA(closes, 50);
    ema20Ref.current?.setData(toSeries(ema20vals));
    ema50Ref.current?.setData(toSeries(ema50vals));

    // Bollinger
    const bb = calcBollinger(closes);
    bbUpperRef.current?.setData(toSeries(bb.upper));
    bbMiddleRef.current?.setData(toSeries(bb.middle));
    bbLowerRef.current?.setData(toSeries(bb.lower));

    // RSI
    const rsiVals = calcRSI(closes);
    rsiSeriesRef.current?.setData(toSeries(rsiVals));

    if (rsiOBRef.current && rsiOSRef.current && times.length > 0) {
      const obData = [{ time: times[0], value: 70 }, { time: times[times.length - 1], value: 70 }];
      const osData = [{ time: times[0], value: 30 }, { time: times[times.length - 1], value: 30 }];
      rsiOBRef.current.setData(obData);
      rsiOSRef.current.setData(osData);
    }

    chartRsiRef.current?.timeScale().fitContent();

    // MACD
    const macd = calcMACD(closes);
    macdLineRef.current?.setData(toSeries(macd.macdLine));
    macdSigRef.current?.setData(toSeries(macd.signalLine));

    const histData = macd.histogram
      .map((v, i) => v != null ? { time: times[i], value: v, color: v >= 0 ? 'rgba(74,222,128,0.7)' : 'rgba(248,113,113,0.7)' } : null)
      .filter(Boolean);
    macdHistRef.current?.setData(histData);
    chartMacdRef.current?.timeScale().fitContent();

  }, [data, showRSI, showMACD]);

  // ── Show / hide indicator series when toggles change ────────────────────

  useEffect(() => {
    const applyVisible = (series, visible) => {
      series?.applyOptions({ visible });
    };
    applyVisible(ema20Ref.current,   showEMA);
    applyVisible(ema50Ref.current,   showEMA);
    applyVisible(bbUpperRef.current, showBB);
    applyVisible(bbMiddleRef.current,showBB);
    applyVisible(bbLowerRef.current, showBB);
  }, [showEMA, showBB]);

  // ── Annotation price lines ───────────────────────────────────────────────

  useEffect(() => {
    const series = csRef.current;
    if (!series) return;

    priceLinesRef.current.forEach(line => {
      try { series.removePriceLine(line); } catch { /* noop */ }
    });
    priceLinesRef.current = [];

    if (!finalAnalysis?.annotations?.length) return;

    finalAnalysis.annotations.forEach(ann => {
      let color = '#a1a1aa';
      let lineStyle = 2;
      if (ann.style === 'support')     { color = '#4ade80'; lineStyle = 0; }
      else if (ann.style === 'resistance') { color = '#f87171'; lineStyle = 0; }
      else if (ann.style === 'stop_loss')  { color = '#ef4444'; }
      else if (ann.style === 'take_profit'){ color = '#22c55e'; }

      const line = series.createPriceLine({
        price: ann.value, color, lineWidth: 2, lineStyle,
        axisLabelVisible: true, title: ann.label,
      });
      priceLinesRef.current.push(line);
    });
  }, [finalAnalysis]);

  return (
    <div className={`glass-card ${styles.chartWrapper}`}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <h3>{symbol}</h3>
        <div className={styles.badges}>
          <span className={styles.badge}>{timeframe}</span>
          {loading && <Loader2 className={styles.spin} size={14} />}
          {!loading && !isMockData && (
            <span className={styles.liveBadge}><Wifi size={11} />LIVE</span>
          )}
        </div>
        {/* Indicator toggles */}
        <div className={styles.indicatorToggles}>
          {INDICATOR_OPTS.map((name) => (
            <button
              key={name}
              className={`${styles.indToggle} ${activeIndicators.includes(name) ? styles.indToggleOn : ''}`}
              onClick={() => toggleIndicator(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {isMockData && (
        <div className={styles.mockBanner}>
          <AlertTriangle size={14} />
          <span><strong>SIMULATED DATA</strong> — Binance API is unreachable on this network. Enable Cloudflare WARP to load real market data.</span>
        </div>
      )}

      {error ? (
        <div className={styles.errorCenter}>{error}</div>
      ) : (
        <>
          {/* Main candle chart */}
          <div ref={mainRef} className={styles.chartContainer} />

          {/* RSI sub-pane */}
          {showRSI && (
            <div className={styles.subPane}>
              <div className={styles.subPaneLabel}>RSI (14)</div>
              <div ref={rsiRef} className={styles.subChart} />
            </div>
          )}

          {/* MACD sub-pane */}
          {showMACD && (
            <div className={styles.subPane}>
              <div className={styles.subPaneLabel}>MACD (12, 26, 9)</div>
              <div ref={macdRef} className={styles.subChart} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TradingChart;
