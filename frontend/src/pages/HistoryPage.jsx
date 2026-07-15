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

const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };
  
  // Close when clicking outside can be done by a simple blur or overlay, but for simplicity:
  return (
    <div className={styles.multiSelectContainer} onMouseLeave={() => setOpen(false)}>
      <button type="button" className={styles.selectInput} onClick={() => setOpen(!open)}>
        {label} {selected.length > 0 ? `(${selected.length})` : ''}
      </button>
      {open && (
        <div className={styles.multiSelectDropdown}>
          {options.map(o => (
            <label key={o.value} className={styles.multiSelectLabel}>
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage   = parseInt(searchParams.get('page') || '1', 10);
  const currentSymbol = searchParams.get('symbol') || '';
  const currentDirection = searchParams.get('direction') || '';
  const currentConflictsOnly = searchParams.get('conflictsOnly') === 'true';
  const currentMinConfidence = searchParams.get('minConfidence') || '';
  const currentTradeModes = searchParams.get('tradeModes') ? searchParams.get('tradeModes').split(',') : [];
  const currentHtfAlignments = searchParams.get('htfAlignments') ? searchParams.get('htfAlignments').split(',') : [];
  const currentLiquidityBiases = searchParams.get('liquidityBiases') ? searchParams.get('liquidityBiases').split(',') : [];

  const [items,      setItems]      = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [pairs,      setPairs]      = useState([]);
  const [filterInput, setFilterInput] = useState(currentSymbol);
  const [directionFilter, setDirectionFilter] = useState(currentDirection);
  const [conflictsOnly, setConflictsOnly] = useState(currentConflictsOnly);
  const [minConfidence, setMinConfidence] = useState(currentMinConfidence);
  const [tradeModesFilter, setTradeModesFilter] = useState(currentTradeModes);
  const [htfAlignmentsFilter, setHtfAlignmentsFilter] = useState(currentHtfAlignments);
  const [liquidityBiasesFilter, setLiquidityBiasesFilter] = useState(currentLiquidityBiases);

  const [selectedForCompare, setSelectedForCompare] = useState([]);

  // Load pair options for the dropdown
  useEffect(() => {
    PairService.getAll().then(setPairs).catch(() => {});
  }, []);

  const fetchPage = useCallback(async (page, symbol, filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await AnalysisService.getList(page, PAGE_SIZE, symbol, filters);
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
    fetchPage(currentPage, currentSymbol, {
      ...(currentDirection ? { direction: currentDirection } : {}),
      ...(currentConflictsOnly ? { conflictsOnly: true } : {}),
      ...(currentMinConfidence ? { minConfidence: currentMinConfidence } : {}),
      ...(currentTradeModes.length ? { tradeModes: currentTradeModes.join(',') } : {}),
      ...(currentHtfAlignments.length ? { htfAlignments: currentHtfAlignments.join(',') } : {}),
      ...(currentLiquidityBiases.length ? { liquidityBiases: currentLiquidityBiases.join(',') } : {}),
    });
  }, [currentPage, currentSymbol, currentDirection, currentConflictsOnly, currentMinConfidence, 
      JSON.stringify(currentTradeModes), JSON.stringify(currentHtfAlignments), JSON.stringify(currentLiquidityBiases), fetchPage]);

  const goPage = (p) => {
    const params = {};
    if (p > 1) params.page = String(p);
    if (currentSymbol) params.symbol = currentSymbol;
    if (currentDirection) params.direction = currentDirection;
    if (currentConflictsOnly) params.conflictsOnly = 'true';
    if (currentMinConfidence) params.minConfidence = currentMinConfidence;
    if (currentTradeModes.length) params.tradeModes = currentTradeModes.join(',');
    if (currentHtfAlignments.length) params.htfAlignments = currentHtfAlignments.join(',');
    if (currentLiquidityBiases.length) params.liquidityBiases = currentLiquidityBiases.join(',');
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (filterInput) params.symbol = filterInput;
    if (directionFilter) params.direction = directionFilter;
    if (conflictsOnly) params.conflictsOnly = 'true';
    if (minConfidence) params.minConfidence = minConfidence;
    if (tradeModesFilter.length) params.tradeModes = tradeModesFilter.join(',');
    if (htfAlignmentsFilter.length) params.htfAlignments = htfAlignmentsFilter.join(',');
    if (liquidityBiasesFilter.length) params.liquidityBiases = liquidityBiasesFilter.join(',');
    setSearchParams(params);
  };

  const handleClear = () => {
    setFilterInput('');
    setDirectionFilter('');
    setConflictsOnly(false);
    setMinConfidence('');
    setTradeModesFilter([]);
    setHtfAlignmentsFilter([]);
    setLiquidityBiasesFilter([]);
    setSearchParams({});
  };

  const hasActiveFilters = currentSymbol || currentDirection || currentConflictsOnly || currentMinConfidence || 
                           currentTradeModes.length > 0 || currentHtfAlignments.length > 0 || currentLiquidityBiases.length > 0;

  const relativeTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)   return 'just now';
    if (m < 60)  return `${m}m ago`;
    if (m < 1440) return `${Math.floor(m / 60)}h ago`;
    return `${Math.floor(m / 1440)}d ago`;
  };

  const handleSelectForCompare = (id) => {
    setSelectedForCompare(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleCompareClick = () => {
    if (selectedForCompare.length === 2) {
      navigate(`/compare?id1=${selectedForCompare[0]}&id2=${selectedForCompare[1]}`);
    }
  };

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h2 className={styles.title}>Analysis History</h2>
          {!loading && <span className={styles.count}>{totalCount} analyses</span>}
        </div>

        {selectedForCompare.length > 0 && (
          <div className={styles.compareToolbar}>
            <span className={styles.compareCount}>{selectedForCompare.length}/2 selected</span>
            <button 
              className={styles.compareBtn} 
              disabled={selectedForCompare.length !== 2}
              onClick={handleCompareClick}
            >
              Compare
            </button>
            <button 
              className={styles.clearCompareBtn}
              onClick={() => setSelectedForCompare([])}
            >
              Clear
            </button>
          </div>
        )}

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
          <select
            className={styles.selectInput}
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
          >
            <option value="">All directions</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
            <option value="neutral">Wait</option>
          </select>
          <select
            className={styles.selectInput}
            value={minConfidence}
            onChange={(e) => setMinConfidence(e.target.value)}
          >
            <option value="">Any confidence</option>
            <option value="0.5">≥ 50%</option>
            <option value="0.7">≥ 70%</option>
            <option value="0.85">≥ 85%</option>
          </select>
          <MultiSelectDropdown 
            label="Trade Mode"
            options={[
              { label: 'Trend', value: 'trend' },
              { label: 'Range', value: 'range' },
              { label: 'Breakout Watch', value: 'breakout_watch' },
            ]}
            selected={tradeModesFilter}
            onChange={setTradeModesFilter}
          />
          <MultiSelectDropdown 
            label="HTF Alignment"
            options={[
              { label: 'Aligned', value: 'aligned' },
              { label: 'Mixed', value: 'mixed' },
              { label: 'Conflict', value: 'conflict' },
            ]}
            selected={htfAlignmentsFilter}
            onChange={setHtfAlignmentsFilter}
          />
          <MultiSelectDropdown 
            label="Liquidity Bias"
            options={[
              { label: 'Bid Heavy', value: 'bid_heavy' },
              { label: 'Ask Heavy', value: 'ask_heavy' },
              { label: 'Balanced', value: 'balanced' },
            ]}
            selected={liquidityBiasesFilter}
            onChange={setLiquidityBiasesFilter}
          />
          <label className={styles.checkboxFilter}>
            <input
              type="checkbox"
              checked={conflictsOnly}
              onChange={(e) => setConflictsOnly(e.target.checked)}
            />
            Conflicts only
          </label>
          <button type="submit" className={styles.filterBtn} disabled={loading}>
            <Search size={13} /> Search
          </button>
          {hasActiveFilters && (
            <button type="button" className={styles.clearBtn} onClick={handleClear}>
              Clear
            </button>
          )}
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => fetchPage(currentPage, currentSymbol, {
              ...(currentDirection ? { direction: currentDirection } : {}),
              ...(currentConflictsOnly ? { conflictsOnly: true } : {}),
              ...(currentMinConfidence ? { minConfidence: currentMinConfidence } : {}),
              ...(currentTradeModes.length ? { tradeModes: currentTradeModes.join(',') } : {}),
              ...(currentHtfAlignments.length ? { htfAlignments: currentHtfAlignments.join(',') } : {}),
              ...(currentLiquidityBiases.length ? { liquidityBiases: currentLiquidityBiases.join(',') } : {}),
            })}
            disabled={loading}
          >
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
              <th className={styles.chkTh}></th>
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
                className={`${styles.row} ${selectedForCompare.includes(item.id) ? styles.rowSelected : ''}`}
                onClick={() => navigate(`/analysis/${item.id}`)}
                title="Click to view full analysis"
              >
                <td className={styles.chkTd} onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={selectedForCompare.includes(item.id)}
                    onChange={() => handleSelectForCompare(item.id)}
                    className={styles.compareChk}
                  />
                </td>
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
