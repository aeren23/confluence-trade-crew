import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import styles from './ComparePage.module.css';
import { AnalysisService } from '../services/apiClient';
import SynthesisPanelStatic from '../components/Analysis/SynthesisPanelStatic';
import { ArrowLeft, GitCompare, Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';

const SentimentIcon = ({ s }) => {
  if (s === 'Bullish') return <TrendingUp  size={16} className={styles.bullish} />;
  if (s === 'Bearish') return <TrendingDown size={16} className={styles.bearish} />;
  return <Minus size={16} className={styles.neutral} />;
};

const ComparePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const id1 = searchParams.get('id1');
  const id2 = searchParams.get('id2');

  const [data1, setData1] = useState(null);
  const [data2, setData2] = useState(null);
  const [parsed1, setParsed1] = useState(null);
  const [parsed2, setParsed2] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id1 || !id2) {
      setError('Please select two analyses to compare.');
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      AnalysisService.getById(id1),
      AnalysisService.getById(id2),
    ])
      .then(([res1, res2]) => {
        setData1(res1);
        setData2(res2);
        setParsed1({ ...JSON.parse(res1.resultJson), _meta: res1 });
        setParsed2({ ...JSON.parse(res2.resultJson), _meta: res2 });
      })
      .catch(() => {
        setError('Failed to load one or both analyses for comparison.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id1, id2]);

  if (loading) {
    return (
      <div className={styles.centered}>
        <Loader2 size={28} className={styles.spin} />
        <span>Loading comparison...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centered}>
        <AlertTriangle size={28} className={styles.errorIcon} />
        <span>{error}</span>
        <Link to="/history" className={styles.backLink}><ArrowLeft size={14} /> Back to History</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <button className={styles.backBtn} onClick={() => navigate('/history')}>
            <ArrowLeft size={14} /> Back
          </button>
          <span className={styles.sep}>/</span>
          <span className={styles.idLabel}>Comparison</span>
        </div>
        <div className={styles.headerTitle}>
          <GitCompare size={18} />
          <h2>Comparing Analyses</h2>
        </div>
      </div>

      <div className={styles.comparisonGrid}>
        {/* Left Column (Analysis 1) */}
        <div className={styles.compareCol}>
          <div className={styles.colHeader}>
            <div className={styles.metaRow}>
              <SentimentIcon s={data1.overallSentiment} />
              <span className={`${styles.metaSentiment} ${styles[data1.overallSentiment?.toLowerCase()]}`}>
                {data1.overallSentiment}
              </span>
              <span className={styles.metaSymbol}>{data1.symbol}</span>
              <span className={styles.metaTf}>{data1.timeframe}</span>
            </div>
            <div className={styles.metaSub}>
              <span>Score: <b>{data1.overallSentimentScore?.toFixed(2)}</b></span>
              <span>Conf: <b>{(data1.confidence * 100).toFixed(0)}%</b></span>
              <span className={styles.metaDate}>
                <Clock size={11} /> {new Date(data1.createdAt).toLocaleString()}
              </span>
            </div>
            <Link to={`/analysis/${data1.id}`} className={styles.viewFullBtn}>View Full Analysis</Link>
          </div>
          <div className={styles.panelWrapper}>
            <SynthesisPanelStatic analysisData={parsed1} />
          </div>
        </div>

        <div className={styles.divider}></div>

        {/* Right Column (Analysis 2) */}
        <div className={styles.compareCol}>
          <div className={styles.colHeader}>
            <div className={styles.metaRow}>
              <SentimentIcon s={data2.overallSentiment} />
              <span className={`${styles.metaSentiment} ${styles[data2.overallSentiment?.toLowerCase()]}`}>
                {data2.overallSentiment}
              </span>
              <span className={styles.metaSymbol}>{data2.symbol}</span>
              <span className={styles.metaTf}>{data2.timeframe}</span>
            </div>
            <div className={styles.metaSub}>
              <span>Score: <b>{data2.overallSentimentScore?.toFixed(2)}</b></span>
              <span>Conf: <b>{(data2.confidence * 100).toFixed(0)}%</b></span>
              <span className={styles.metaDate}>
                <Clock size={11} /> {new Date(data2.createdAt).toLocaleString()}
              </span>
            </div>
            <Link to={`/analysis/${data2.id}`} className={styles.viewFullBtn}>View Full Analysis</Link>
          </div>
          <div className={styles.panelWrapper}>
            <SynthesisPanelStatic analysisData={parsed2} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparePage;
