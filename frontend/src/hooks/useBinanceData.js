import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

/**
 * Custom hook to fetch public OHLCV data via the .NET backend proxy.
 * Returns `isMockData: true` when the backend could not reach Binance and
 * generated synthetic data instead (indicated via the X-Data-Source header).
 */
export const useBinanceData = (symbol, timeframe) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Map common timeframes to Binance intervals
        const intervalMap = {
          '15m': '15m',
          '1h': '1h',
          '4h': '4h',
          '1d': '1d'
        };
        const interval = intervalMap[timeframe] || '4h';
        const formattedSymbol = symbol.replace('/', '').toUpperCase(); // BTC/USDT → BTCUSDT

        const response = await apiClient.get('/api/pair/klines', {
          params: {
            symbol: formattedSymbol,
            interval: interval,
            limit: 100
          }
        });

        if (isMounted) {
          // Check if backend served live or mock data
          const dataSource = response.headers['x-data-source'];
          setIsMockData(dataSource === 'mock-generated');

          // Binance klines format: [Open time, Open, High, Low, Close, Volume, ...]
          const formattedData = response.data.map(kline => ({
            time: kline[0] / 1000, // lightweight-charts expects Unix timestamp in seconds
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
          }));

          setData(formattedData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch historical data from Binance');
          console.error('Binance data fetch error:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [symbol, timeframe]);

  return { data, loading, error, isMockData };
};
