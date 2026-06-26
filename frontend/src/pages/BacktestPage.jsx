import React, { useState, useEffect } from 'react';
import { BacktestService, PairService, StrategyService } from '../services/apiClient';
import BacktestDashboard from '../components/Backtest/BacktestDashboard';
import { Loader2, Play } from 'lucide-react';
import styles from './BacktestPage.module.css';

const TIMEFRAMES = ['15m', '1h', '4h', '1d'];

const BacktestPage = () => {
  const [pairs, setPairs] = useState([]);
  const [strategies, setStrategies] = useState([]);
  
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({
    symbol: '',
    timeframe: '1h',
    startDate: '',
    endDate: '',
    initialBalance: 1000,
    riskPercentage: 2.0,
    maxTrades: '',
    tradingFeePercentage: 0.0,
    strategyId: ''
  });

  useEffect(() => {
    const init = async () => {
      try {
        const [pairsData, strategiesData] = await Promise.all([
          PairService.getAll({ activeOnly: true }),
          StrategyService.getAll()
        ]);
        
        setPairs(pairsData);
        setStrategies(strategiesData);
        
        const defaultDate = new Date();
        const pastDate = new Date();
        pastDate.setMonth(pastDate.getMonth() - 3);

        setForm(prev => ({
          ...prev,
          symbol: pairsData.length > 0 ? pairsData[0].symbol : 'BTC/USDT',
          startDate: pastDate.toISOString().split('T')[0],
          endDate: defaultDate.toISOString().split('T')[0],
          strategyId: strategiesData.length > 0 ? strategiesData[0].id : ''
        }));
      } catch (err) {
        setError('Failed to load configuration data');
      } finally {
        setLoadingConfig(false);
      }
    };
    init();
  }, []);

  const handleRun = async (e) => {
    e.preventDefault();
    if (!form.symbol || !form.startDate || !form.endDate) {
      setError('Please fill in all required fields');
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        symbol: form.symbol,
        timeframe: form.timeframe,
        start_date: new Date(form.startDate).toISOString(),
        end_date: new Date(form.endDate).toISOString(),
        initial_balance: parseFloat(form.initialBalance),
        risk_percentage: parseFloat(form.riskPercentage),
        max_trades: form.maxTrades ? parseInt(form.maxTrades, 10) : null,
        trading_fee_percentage: parseFloat(form.tradingFeePercentage || 0),
        strategy_id: form.strategyId || null
      };

      const data = await BacktestService.run(payload);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.details || err.message || 'Backtest failed');
    } finally {
      setRunning(false);
    }
  };

  if (loadingConfig) {
    return <div className={styles.centered}><Loader2 className={styles.spin} /> Loading Backtest Engine...</div>;
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h2>Backtest Mode</h2>
          <p>Simulate AI strategies on historical data using vectorized analysis.</p>
        </div>
      </header>

      <div className={styles.disclaimerBox}>
        <div className={styles.disclaimerIcon}>ℹ️</div>
        <div className={styles.disclaimerText}>
          <strong>Note on Simulation Accuracy:</strong> This backtest engine uses high-speed vectorized Technical Analysis (TA). 
          News Sentiment and On-Chain data are treated as neutral (0.0) during historical simulations. 
          Real-world AI pipeline decisions may vary based on live fundamental data.
        </div>
      </div>

      <div className={styles.configCard}>
        <form onSubmit={handleRun} className={styles.formGrid}>
          <div className={styles.field}>
            <label>Pair</label>
            <select value={form.symbol} onChange={e => setForm({...form, symbol: e.target.value})} className={styles.input}>
              {pairs.map(p => <option key={p.symbol} value={p.symbol}>{p.symbol}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label>Candle Resolution</label>
            <select value={form.timeframe} onChange={e => setForm({...form, timeframe: e.target.value})} className={styles.input}>
              {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </select>
            <small className={styles.helpText}>Data granularity for the engine.</small>
          </div>

          <div className={styles.field}>
            <label>Start Date</label>
            <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className={styles.input} />
          </div>

          <div className={styles.field}>
            <label>End Date</label>
            <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} className={styles.input} />
          </div>

          <div className={styles.field}>
            <label>Strategy</label>
            <select value={form.strategyId} onChange={e => setForm({...form, strategyId: e.target.value})} className={styles.input}>
              <option value="">Default Rules</option>
              {strategies.map(s => <option key={s.id} value={s.id}>{s.displayName}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label>Initial Balance ($)</label>
            <input type="number" value={form.initialBalance} onChange={e => setForm({...form, initialBalance: e.target.value})} className={styles.input} />
          </div>

          <div className={styles.field}>
            <label>Risk Per Trade (%)</label>
            <input type="number" step="0.1" value={form.riskPercentage} onChange={e => setForm({...form, riskPercentage: e.target.value})} className={styles.input} />
          </div>

          <div className={styles.field}>
            <label>Max Trades Limit</label>
            <input type="number" placeholder="Unlimited" value={form.maxTrades} onChange={e => setForm({...form, maxTrades: e.target.value})} className={styles.input} />
          </div>

          <div className={styles.field}>
            <label>Trading Fee (%)</label>
            <input type="number" step="0.01" value={form.tradingFeePercentage} onChange={e => setForm({...form, tradingFeePercentage: e.target.value})} className={styles.input} />
            <small className={styles.helpText}>Optional. Example: 0.1 for Binance.</small>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.runBtn} disabled={running}>
              {running ? <Loader2 className={styles.spin} size={16} /> : <Play size={16} />}
              {running ? 'Simulating...' : 'Run Backtest'}
            </button>
          </div>
        </form>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {result && <BacktestDashboard result={result} />}
    </div>
  );
};

export default BacktestPage;
