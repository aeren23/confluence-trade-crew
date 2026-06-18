import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import styles from './TradingChart.module.css';
import useAppStore from '../../store/useAppStore';
import { useBinanceData } from '../../hooks/useBinanceData';
import { Loader2, AlertTriangle, Wifi } from 'lucide-react';

const TradingChart = () => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const { symbol, timeframe, finalAnalysis } = useAppStore();

  // Custom hook fetching public OHLCV data via the .NET backend proxy
  const { data, loading, error, isMockData } = useBinanceData(symbol, timeframe);

  // Initialize Chart and handle window resize
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#a1a1aa',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 0,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#4ade80',
      downColor: '#f87171',
      borderVisible: false,
      wickUpColor: '#4ade80',
      wickDownColor: '#f87171',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update Data
  useEffect(() => {
    if (candlestickSeriesRef.current && data.length > 0) {
      candlestickSeriesRef.current.setData(data);
      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  // Handle AI Annotations Overlay
  useEffect(() => {
    if (!candlestickSeriesRef.current || !finalAnalysis?.annotations) return;

    finalAnalysis.annotations.forEach(ann => {
      let color = '#a1a1aa';
      let lineStyle = 2; // Dashed

      if (ann.style === 'support') {
        color = '#4ade80';
        lineStyle = 0;
      } else if (ann.style === 'resistance') {
        color = '#f87171';
        lineStyle = 0;
      } else if (ann.style === 'stop_loss') {
        color = '#ef4444';
      } else if (ann.style === 'take_profit') {
        color = '#22c55e';
      }

      candlestickSeriesRef.current.createPriceLine({
        price: ann.value,
        color: color,
        lineWidth: 2,
        lineStyle: lineStyle,
        axisLabelVisible: true,
        title: ann.label,
      });
    });
  }, [finalAnalysis]);

  return (
    <div className={`glass-card ${styles.chartWrapper}`}>
      <div className={styles.header}>
        <h3>{symbol}</h3>
        <div className={styles.badges}>
          <span className={styles.badge}>{timeframe}</span>
          {loading && <Loader2 className={styles.spin} size={14} />}
          {!loading && !isMockData && (
            <span className={styles.liveBadge}>
              <Wifi size={11} />
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Mock data warning banner */}
      {isMockData && (
        <div className={styles.mockBanner}>
          <AlertTriangle size={14} />
          <span>
            <strong>SIMULATED DATA</strong> — Binance API is unreachable on this network.
            Enable Cloudflare WARP to load real market data.
          </span>
        </div>
      )}

      {error ? (
        <div className={styles.errorCenter}>{error}</div>
      ) : (
        <div ref={chartContainerRef} className={styles.chartContainer} />
      )}
    </div>
  );
};

export default TradingChart;
