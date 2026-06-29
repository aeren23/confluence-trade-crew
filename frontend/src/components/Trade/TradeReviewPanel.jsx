import React, { useState, useEffect } from 'react';
import styles from './TradeReviewPanel.module.css';
import { TradeReviewService } from '../../services/apiClient';
import { Loader2, CheckCircle, AlertCircle, XCircle, Clock, Target, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';

const TradeReviewPanel = ({ tradeId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [tradeId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await TradeReviewService.getByTrade(tradeId);
      setReviews(data || []);
    } catch (err) {
      setError('Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReview = async () => {
    setGenerating(true);
    setError(null);
    try {
      const newReview = await TradeReviewService.generate(tradeId);
      setReviews([newReview, ...reviews]);
      setExpanded(true);
    } catch (err) {
      setError('Failed to generate review. Check backend logs.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <Loader2 className={styles.spin} size={20} /> Loading AI Review...
        </div>
      </div>
    );
  }

  const latestReview = reviews[0];

  if (!latestReview) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>No AI Review available for this trade yet.</p>
          <button 
            className={styles.generateBtn} 
            onClick={handleGenerateReview} 
            disabled={generating}
          >
            {generating ? <><Loader2 className={styles.spin} size={14} /> Analyzing...</> : 'Generate AI Review'}
          </button>
          {error && <div className={styles.errorText}>{error}</div>}
        </div>
      </div>
    );
  }

  const getVerdictStyle = (verdict) => {
    switch (verdict?.toLowerCase()) {
      case 'good': return styles.verdictGood;
      case 'fair': return styles.verdictFair;
      case 'poor': return styles.verdictPoor;
      default: return '';
    }
  };

  const scorePct = Math.round(latestReview.executionScore * 100);

  return (
    <div className={styles.container}>
      <div className={styles.header} onClick={() => setExpanded(!expanded)}>
        <div className={styles.headerLeft}>
          <h4 className={styles.title}>AI Trade Review</h4>
          <span className={`${styles.verdictBadge} ${getVerdictStyle(latestReview.verdict)}`}>
            {latestReview.verdict?.toUpperCase()}
          </span>
          <span className={styles.scoreText}>Execution Score: {scorePct}%</span>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.generateBtnSmall} 
            onClick={(e) => { e.stopPropagation(); handleGenerateReview(); }} 
            disabled={generating}
          >
            {generating ? <Loader2 className={styles.spin} size={14} /> : 'Re-Evaluate'}
          </button>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>
      
      {error && <div className={styles.errorBanner}>{error}</div>}

      {expanded && (
        <div className={styles.content}>
          <div className={styles.scoreBarContainer}>
            <div 
              className={styles.scoreBarFill} 
              style={{ width: `${scorePct}%`, backgroundColor: scorePct >= 70 ? 'var(--color-green)' : scorePct >= 40 ? 'var(--color-yellow)' : 'var(--color-red)' }} 
            />
          </div>

          <div className={styles.grid}>
            {/* Plan Adherence */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                {latestReview.planAdherence ? <CheckCircle size={16} className={styles.iconGreen} /> : <XCircle size={16} className={styles.iconRed} />}
                <h5>Plan Adherence</h5>
              </div>
              <p className={styles.cardBody}>{latestReview.planAdherenceExplanation}</p>
            </div>

            {/* SL / TP Rationality */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                {latestReview.slTpRational ? <Target size={16} className={styles.iconGreen} /> : <AlertCircle size={16} className={styles.iconYellow} />}
                <h5>SL/TP Rationality</h5>
              </div>
              <p className={styles.cardBody}>{latestReview.slTpAnalysis}</p>
            </div>

            {/* Timing */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <Clock size={16} className={latestReview.timingVerdict === 'optimal' ? styles.iconGreen : styles.iconYellow} />
                <h5>Timing ({latestReview.timingVerdict})</h5>
              </div>
              <p className={styles.cardBody}>{latestReview.timingExplanation}</p>
            </div>

            {/* Improvement Advice */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <ArrowUpRight size={16} className={styles.iconBlue} />
                <h5>Improvement Advice</h5>
              </div>
              <p className={styles.cardBody}>{latestReview.improvementAdvice}</p>
            </div>
          </div>
          
          {reviews.length > 1 && (
            <div className={styles.historyNote}>
              Note: This trade has been reviewed {reviews.length} times. Showing the most recent.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TradeReviewPanel;
