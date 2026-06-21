import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styles from './AnalysisDetailPage.module.css';
import { AnalysisService, TradeService } from '../services/apiClient';
import useAppStore from '../store/useAppStore';
import SynthesisPanelStatic from '../components/Analysis/SynthesisPanelStatic';
import AccuracyDashboard from '../components/Analysis/AccuracyDashboard';
import {
  ArrowLeft, Clock, TrendingUp, TrendingDown, Minus,
  Loader2, AlertTriangle, ExternalLink, Link2
} from 'lucide-react';

const AnalysisDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openTradeForm } = useAppStore();

  const [analysis,      setAnalysis]      = useState(null);
  const [parsed,        setParsed]        = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [linkedTrades,  setLinkedTrades]  = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      AnalysisService.getById(id),
      TradeService.byAnalysis(id).catch(() => []),
    ])
      .then(([dto, trades]) => {
        if (cancelled) return;
        const resultObj = JSON.parse(dto.resultJson);
        setAnalysis(dto);
        setLinkedTrades(trades || []);
        setParsed({
          ...resultObj,
          _meta: {
            id: dto.id,
            createdAt: dto.createdAt,
            symbol: dto.symbol,
            timeframe: dto.timeframe,
            requestedBalance: dto.requestedBalance,
            requestedRiskPercentage: dto.requestedRiskPercentage,
            overallSentiment: dto.overallSentiment,
            overallSentimentScore: dto.overallSentimentScore,
            confidence: dto.confidence,
          },
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.status === 404 ? 'Analysis not found.' : 'Failed to load analysis.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  const handleTakeTrade = () => {
    if (!parsed) return;
    const riskDetails = parsed.agents?.risk?.details || {};
    const levels      = riskDetails.levels || {};
    const leverage    = riskDetails.leverage || {};
    const sizing      = riskDetails.position_sizing || {};
    const direction   = riskDetails.position_direction;
    if (direction === 'neutral') return;
    openTradeForm({
      symbol:      analysis.symbol,
      direction:   direction === 'long' ? 'Long' : 'Short',
      entryPrice:  levels.entry || levels.entry_reference || '',
      stopLoss:    levels.stop_loss || '',
      takeProfit:  levels.take_profit || '',
      leverage:    leverage.capped_maximum || leverage.recommended_range || 1,
      entryAmount: sizing.suggested_position_size_usdt || sizing.position_size_usdt || '',
      analysisId:  id,
    });
  };

  const SentimentIcon = ({ s }) => {
    if (s === 'Bullish') return <TrendingUp  size={16} className={styles.bullish} />;
    if (s === 'Bearish') return <TrendingDown size={16} className={styles.bearish} />;
    return <Minus size={16} className={styles.neutral} />;
  };

  if (loading) {
    return (
      <div className={styles.centered}>
        <Loader2 size={28} className={styles.spin} />
        <span>Loading analysis...</span>
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

  const direction = parsed?.agents?.risk?.details?.position_direction;
  const canTrade  = direction && direction !== 'neutral';

  return (
    <div className={styles.page}>
      {/* Breadcrumb + actions header */}
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </button>
          <span className={styles.sep}>/</span>
          <Link to="/history" className={styles.breadLink}>History</Link>
          <span className={styles.sep}>/</span>
          <span className={styles.idLabel}>{id.slice(0, 8)}…</span>
        </div>

        <div className={styles.headerRight}>
          {canTrade && (
            <button className={styles.tradeBtn} onClick={handleTakeTrade}>
              {direction === 'long' ? '▲' : '▼'} Take This Trade
            </button>
          )}
        </div>
      </div>

      {/* Analysis metadata card */}
      <div className={styles.metaCard}>
        <div className={styles.metaLeft}>
          <SentimentIcon s={analysis.overallSentiment} />
          <span className={`${styles.metaSentiment} ${styles[analysis.overallSentiment?.toLowerCase()]}`}>
            {analysis.overallSentiment}
          </span>
          <span className={styles.metaSep}>·</span>
          <span className={styles.metaSymbol}>{analysis.symbol}</span>
          <span className={styles.metaTf}>{analysis.timeframe}</span>
        </div>
        <div className={styles.metaRight}>
          <span className={styles.metaStat}>Score <b>{analysis.overallSentimentScore?.toFixed(2)}</b></span>
          <span className={styles.metaStat}>Confidence <b>{(analysis.confidence * 100).toFixed(0)}%</b></span>
          <span className={styles.metaStat}>Balance <b>{analysis.requestedBalance} USDT</b></span>
          <span className={styles.metaStat}>Risk <b>{analysis.requestedRiskPercentage}%</b></span>
          <span className={styles.metaDate}>
            <Clock size={11} /> {new Date(analysis.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Accuracy Tracking Widget */}
      <AccuracyDashboard analysisId={analysis.id} initialSentiment={analysis.overallSentiment} />

      {/* Full synthesis panel (static, no store dependency) */}
      <SynthesisPanelStatic analysisData={parsed} />

      {/* Linked trades */}
      <div className={styles.linkedTradesCard}>
        <div className={styles.linkedTradesHeader}>
          <Link2 size={14} />
          <span>Trades from this Analysis ({linkedTrades.length})</span>
        </div>
        {linkedTrades.length === 0 ? (
          <p className={styles.linkedTradesEmpty}>No trades linked to this analysis yet.</p>
        ) : (
          <table className={styles.linkedTradesTable}>
            <thead>
              <tr>
                <th>Direction</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Status</th>
                <th>PnL</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {linkedTrades.map((t) => (
                <tr key={t.id}>
                  <td className={t.direction === 'Long' ? styles.bullish : styles.bearish}>{t.direction}</td>
                  <td>{t.entryPrice}</td>
                  <td>{t.exitPrice ?? '—'}</td>
                  <td>{t.status}</td>
                  <td className={(t.pnlQuote ?? 0) >= 0 ? styles.profitCell : styles.lossCell}>
                    {t.pnlQuote != null ? `${t.pnlQuote >= 0 ? '+' : ''}${t.pnlQuote.toFixed(2)} USDT` : '—'}
                  </td>
                  <td>{new Date(t.entryAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AnalysisDetailPage;
