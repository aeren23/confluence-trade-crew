import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './HistoryPage.module.css';
import { AnalysisService, PairService } from '../services/apiClient';
import { TrendingUp, TrendingDown, Minus, Clock, Search, RefreshCw, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const PAGE_SIZE = 15;

const SentimentBadge = ({ sentiment }) => {
  const map = {
    Bullish: { cls: styles.bullish, Icon: TrendingUp },
    Bearish: { cls: styles.bearish, Icon: TrendingDown },
    Neutral: { cls: styles.neutral, Icon: Minus },
  };
  const { cls, Icon } = map[sentiment] || map.Neutral;
  return (
    <span className={`${styles.badge} ${cls}`}>
      <Icon size={10} /> {sentiment}
    </span>
  );
};

const Pagination = ({ page, totalPages, onPage }) => {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className={styles.pagination}>
      <button className={styles.pageBtn} onClick={() => onPage(page - 1)} disabled={page <= 1}>
        <ChevronLeft size={14} />
      </button>
      {start > 1 && <><button className={styles.pageBtn} onClick={() => onPage(1)}>1</button><span className={styles.ellipsis}>…</span></>}
      {pages.map(p => (
        <button key={p} className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`} onClick={() => onPage(p)}>
          {p}
        </button>
      ))}
      {end < totalPages && <><span className={styles.ellipsis}>…</span><button className={styles.pageBtn} onClick={() => onPage(totalPages)}>{totalPages}</button></>}
      <button className={styles.pageBtn} onClick={() => onPage(page + 1)} disabled={page >= totalPages}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage   = parseInt(searchParams.get('page') || '1', 10);
  const currentSymbol = searchParams.get('symbol') || '';

  const [items,      setItems]      = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [pairs,      setPairs]      = useState([]);
  const [filterInput, setFilterInput] = useState(currentSymbol);

  // Load pair options for the dropdown
  useEffect(() => {
    PairService.getAll().then(setPairs).catch(() => {});
  }, []);

  const fetchPage = useCallback(async (page, symbol) => {
    setLoading(true);
    setError(null);
    try {
      const data = await AnalysisService.getList(page, PAGE_SIZE, symbol);
      setItems(data.items || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError('Failed to load analysis history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(currentPage, currentSymbol);
  }, [currentPage, currentSymbol, fetchPage]);

  const goPage = (p) => {
    const params = {};
    if (p > 1) params.page = String(p);
    if (currentSymbol) params.symbol = currentSymbol;
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (filterInput) params.symbol = filterInput;
    setSearchParams(params);
  };

  const handleClear = () => {
    setFilterInput('');
    setSearchParams({});
  };

  const relativeTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)   return 'just now';
    if (m < 60)  return `${m}m ago`;
    if (m < 1440) return `${Math.floor(m / 60)}h ago`;
    return `${Math.floor(m / 1440)}d ago`;
  };

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h2 className={styles.title}>Analysis History</h2>
          {!loading && <span className={styles.count}>{totalCount} analyses</span>}
        </div>

        {/* Filters */}
        <form className={styles.filters} onSubmit={handleSearch}>
          <select
            className={styles.selectInput}
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
          >
            <option value="">All pairs</option>
            {pairs.map(p => (
              <option key={p.symbol} value={p.symbol}>{p.symbol}</option>
            ))}
          </select>
          <button type="submit" className={styles.filterBtn} disabled={loading}>
            <Search size={13} /> Search
          </button>
          {currentSymbol && (
            <button type="button" className={styles.clearBtn} onClick={handleClear}>
              Clear
            </button>
          )}
          <button type="button" className={styles.refreshBtn} onClick={() => fetchPage(currentPage, currentSymbol)} disabled={loading}>
            <RefreshCw size={13} className={loading ? styles.spin : ''} />
          </button>
        </form>
      </div>

      {/* Error */}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Pair</th>
              <th>Sentiment</th>
              <th>Score</th>
              <th>Confidence</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className={styles.loadingRow}><RefreshCw size={16} className={styles.spin} /> Loading...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className={styles.emptyRow}>No analyses found{currentSymbol ? ` for "${currentSymbol}"` : ''}.</td></tr>
            )}
            {!loading && items.map(item => (
              <tr
                key={item.id}
                className={styles.row}
                onClick={() => navigate(`/analysis/${item.id}`)}
                title="Click to view full analysis"
              >
                <td className={styles.idCell}>
                  <span className={styles.shortId}>{item.id.slice(0, 8)}</span>
                </td>
                <td>
                  <span className={styles.symbolBadge}>{item.symbol}</span>
                  <span className={styles.tfBadge}>{item.timeframe}</span>
                </td>
                <td><SentimentBadge sentiment={item.overallSentiment} /></td>
                <td>
                  <span className={`${styles.score} ${
                    item.overallSentimentScore > 0.2 ? styles.scoreGreen :
                    item.overallSentimentScore < -0.2 ? styles.scoreRed : styles.scoreYellow
                  }`}>
                    {item.overallSentimentScore?.toFixed(2)}
                  </span>
                </td>
                <td>
                  <div className={styles.confBar}>
                    <div className={styles.confFill} style={{ width: `${(item.confidence * 100).toFixed(0)}%` }} />
                    <span className={styles.confLabel}>{(item.confidence * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td>
                  <span className={styles.dateCell} title={new Date(item.createdAt).toLocaleString()}>
                    <Clock size={10} /> {relativeTime(item.createdAt)}
                  </span>
                </td>
                <td>
                  <button
                    className={styles.viewBtn}
                    onClick={(e) => { e.stopPropagation(); navigate(`/analysis/${item.id}`); }}
                  >
                    <ExternalLink size={12} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination page={currentPage} totalPages={totalPages} onPage={goPage} />
    </div>
  );
};

export default HistoryPage;
