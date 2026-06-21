import React, { useEffect, useState } from 'react';
import styles from './AccuracyDashboard.module.css';
import { AccuracyService } from '../../services/apiClient';
import { Target, Activity, CheckCircle2, XCircle, MinusCircle, RefreshCw, Loader2, ArrowRight } from 'lucide-react';

const AccuracyDashboard = ({ analysisId, initialSentiment }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecords = async () => {
    try {
      const data = await AccuracyService.getByAnalysis(analysisId);
      setRecords(data || []);
    } catch (err) {
      setError('Failed to load accuracy history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (analysisId) {
      fetchRecords();
    }
  }, [analysisId]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    setError(null);
    try {
      // Trigger evaluation for this exact moment ("on-demand")
      await AccuracyService.evaluate(analysisId, 'on-demand');
      await fetchRecords(); // Refresh the list
    } catch (err) {
      setError(err.response?.data || 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  const fmtPct = (val) => {
    if (val == null) return '—';
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  const getStatusIcon = (r) => {
    if (r.wasMissedOpportunity) return <AlertTriangle size={14} className={styles.iconYellow} />;
    if (r.isAccurate) return <CheckCircle2 size={14} className={styles.iconGreen} />;
    if (r.predictedDirection === 'neutral') return <MinusCircle size={14} className={styles.iconNeutral} />;
    return <XCircle size={14} className={styles.iconRed} />;
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.centered}><Loader2 size={18} className={styles.spin} /> Loading accuracy data...</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Target size={16} />
          <h3 className={styles.title}>Model Accuracy Tracking</h3>
        </div>
        <button
          className={styles.evalBtn}
          onClick={handleEvaluate}
          disabled={evaluating}
          title="Check current market price against original prediction"
        >
          {evaluating ? <Loader2 size={13} className={styles.spin} /> : <RefreshCw size={13} />}
          {evaluating ? 'Evaluating...' : 'Evaluate Now'}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {records.length === 0 ? (
        <div className={styles.empty}>
          <p>No accuracy evaluations performed yet.</p>
          <p className={styles.emptySub}>Click "Evaluate Now" to check if the AI's {initialSentiment?.toLowerCase()} prediction was correct.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Interval</th>
                <th>Price Change</th>
                <th>Result</th>
                <th>Expected PnL</th>
                <th>Checked At</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className={styles.intervalBadge}>{r.checkInterval}</span>
                  </td>
                  <td>
                    <span className={r.priceChangePct >= 0 ? styles.textGreen : styles.textRed}>
                      {fmtPct(r.priceChangePct)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.resultCell}>
                      {getStatusIcon(r)}
                      <span>
                        {r.wasMissedOpportunity ? 'Missed Opp' : r.isAccurate ? 'Accurate' : r.predictedDirection === 'neutral' ? 'Neutral' : 'Inaccurate'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={(r.potentialPnlPct ?? 0) >= 0 ? styles.textGreen : styles.textRed}>
                      {fmtPct(r.potentialPnlPct)}
                    </span>
                  </td>
                  <td className={styles.textMuted}>
                    {new Date(r.checkedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AccuracyDashboard;
