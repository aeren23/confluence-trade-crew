import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ControlPanel.module.css';
import useAppStore from '../../store/useAppStore';
import { useAnalysisLogic } from '../../hooks/useAnalysisLogic';
import { Play, Loader2, Settings, Layers } from 'lucide-react';
import { PairService } from '../../services/apiClient';

// Ordered list of available timeframes for MTF chip selection
const AVAILABLE_TIMEFRAMES = ['15m', '1h', '4h', '1d'];

const ControlPanel = () => {
  const {
    symbol, timeframe, balance, riskPercentage, elapsedSeconds, riskProfile,
    isMultiTfMode, selectedTimeframes,
    setSymbol, setTimeframe, setBalance, setRiskPercentage,
    toggleMultiTfMode, toggleTimeframe,
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

        {/* Timeframe — shown only in single-TF mode */}
        {!isMultiTfMode && (
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
        )}

        {/* Multi-Timeframe Toggle */}
        <div className={styles.inputGroup}>
          <label className={styles.mtfLabel}>
            <Layers size={12} />
            Multi-Timeframe Confluence
          </label>
          <div className={styles.mtfToggleRow}>
            <button
              id="mtf-toggle"
              className={`${styles.mtfToggle} ${isMultiTfMode ? styles.mtfToggleOn : ''}`}
              onClick={toggleMultiTfMode}
              disabled={isLoading}
              title={isMultiTfMode ? 'Switch to single timeframe' : 'Enable Multi-Timeframe Confluence'}
            >
              <span className={styles.mtfThumb} />
            </button>
            <span className={styles.mtfToggleHint}>
              {isMultiTfMode ? 'MTF Active' : 'Single TF'}
            </span>
          </div>
          {isMultiTfMode && (
            <div className={styles.tfChips}>
              {AVAILABLE_TIMEFRAMES.map((tf) => {
                const active = selectedTimeframes.includes(tf);
                return (
                  <button
                    key={tf}
                    id={`tf-chip-${tf}`}
                    className={`${styles.tfChip} ${active ? styles.tfChipActive : ''}`}
                    onClick={() => toggleTimeframe(tf)}
                    disabled={isLoading}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          )}
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
