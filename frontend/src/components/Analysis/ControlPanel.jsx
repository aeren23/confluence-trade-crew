import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ControlPanel.module.css';
import useAppStore from '../../store/useAppStore';
import { useAnalysisLogic } from '../../hooks/useAnalysisLogic';
import { Play, Loader2, Settings } from 'lucide-react';
import { PairService } from '../../services/apiClient';

const ControlPanel = () => {
  const {
    symbol, timeframe, balance, riskPercentage, elapsedSeconds, riskProfile,
    setSymbol, setTimeframe, setBalance, setRiskPercentage,
  } = useAppStore();
  const { runAnalysis, status } = useAnalysisLogic();

  const isLoading = status === 'loading';
  const riskAmount = balance && riskPercentage ? (balance * riskPercentage / 100).toFixed(2) : '—';

  const [pairs, setPairs] = useState([]);

  useEffect(() => {
    PairService.getAll()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setPairs(data);
      })
      .catch(() => {});
  }, []);

  const formatElapsed = (s) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className={`glass-card ${styles.panel}`}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>Analysis Configuration</h2>
        <div className={styles.titleActions}>
          {riskProfile && (
            <span className={`${styles.profileBadge} ${styles[`profile_${riskProfile}`]}`}>
              {riskProfile.charAt(0).toUpperCase() + riskProfile.slice(1)}
            </span>
          )}
          <Link to="/settings" className={styles.settingsLink} title="Manage default settings">
            <Settings size={13} />
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Trading Pair */}
        <div className={styles.inputGroup}>
          <label>Trading Pair</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            disabled={isLoading}
            className="input-field"
          >
            {pairs.length > 0 ? (
              pairs.map((p) => (
                <option key={p.symbol} value={p.symbol}>{p.symbol}</option>
              ))
            ) : (
              <>
                <option value="BTC/USDT">BTC/USDT</option>
                <option value="ETH/USDT">ETH/USDT</option>
                <option value="SOL/USDT">SOL/USDT</option>
              </>
            )}
          </select>
        </div>

        {/* Timeframe */}
        <div className={styles.inputGroup}>
          <label>Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            disabled={isLoading}
            className="input-field"
          >
            <option value="15m">15m</option>
            <option value="1h">1H</option>
            <option value="4h">4H</option>
            <option value="1d">1D</option>
          </select>
        </div>

        {/* Portfolio Balance */}
        <div className={styles.inputGroup}>
          <label>Portfolio Balance (USDT)</label>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(parseFloat(e.target.value))}
            disabled={isLoading}
            className="input-field"
          />
        </div>

        {/* Risk Per Trade */}
        <div className={styles.inputGroup}>
          <label>
            Risk Per Trade (%)
            <span className={styles.riskHint}> = {riskAmount} USDT at risk</span>
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="100"
            value={riskPercentage}
            onChange={(e) => setRiskPercentage(parseFloat(e.target.value))}
            disabled={isLoading}
            className="input-field"
          />
        </div>
      </div>

      {/* Run Button */}
      <div className={styles.actions}>
        <button
          className="btn-primary"
          onClick={runAnalysis}
          disabled={isLoading}
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
        >
          {isLoading ? (
            <>
              <Loader2 className={styles.spin} size={18} />
              Running... {formatElapsed(elapsedSeconds)}
            </>
          ) : (
            <>
              <Play size={18} />
              Initialize CrewAI Pipeline
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
