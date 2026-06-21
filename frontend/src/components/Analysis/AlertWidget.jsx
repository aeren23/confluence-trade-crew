import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AlertWidget.module.css';
import { AnalysisService } from '../../services/apiClient';
import { Bell, TrendingUp, TrendingDown, Clock, ArrowRight, Loader2, Target } from 'lucide-react';

const AlertWidget = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch recent analyses that are NOT neutral and have high confidence
    AnalysisService.getList(1, 10, '', { conflictsOnly: false })
      .then(res => {
        if (res && res.items) {
          // Filter out neutral and low confidence to create "Alerts"
          const actionable = res.items.filter(i => 
            i.overallSentiment !== 'Neutral' && 
            i.confidence >= 0.70
          );
          setAlerts(actionable.slice(0, 5));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const relativeTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)   return 'Just now';
    if (m < 60)  return `${m}m ago`;
    if (m < 1440) return `${Math.floor(m / 60)}h ago`;
    return `${Math.floor(m / 1440)}d ago`;
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Bell size={16} className={styles.bellIcon} />
          <h3 className={styles.title}>Recent Trade Alerts</h3>
        </div>
        <button className={styles.viewAllBtn} onClick={() => navigate('/history')}>
          All <ArrowRight size={12} />
        </button>
      </div>

      {loading ? (
        <div className={styles.centered}>
          <Loader2 size={18} className={styles.spin} /> Loading alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className={styles.empty}>
          No high-confidence alerts generated recently.
        </div>
      ) : (
        <div className={styles.alertList}>
          {alerts.map(item => {
            const isBullish = item.overallSentiment === 'Bullish';
            return (
              <div 
                key={item.id} 
                className={styles.alertItem}
                onClick={() => navigate(`/analysis/${item.id}`)}
              >
                <div className={`${styles.iconBox} ${isBullish ? styles.iconBull : styles.iconBear}`}>
                  {isBullish ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </div>
                <div className={styles.alertBody}>
                  <div className={styles.alertTop}>
                    <span className={styles.symbol}>{item.symbol}</span>
                    <span className={styles.tf}>{item.timeframe}</span>
                    <span className={styles.time}><Clock size={10} /> {relativeTime(item.createdAt)}</span>
                  </div>
                  <div className={styles.alertDetails}>
                    <span>{isBullish ? 'Buy' : 'Sell'} Signal</span>
                    <span className={styles.dot}>·</span>
                    <span><Target size={10} /> {(item.confidence * 100).toFixed(0)}% Conf.</span>
                  </div>
                </div>
                <div className={styles.alertRight}>
                  <ArrowRight size={14} className={styles.chevron} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertWidget;
