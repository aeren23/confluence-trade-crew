import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from './TradesPage.module.css';
import { TradeService } from '../services/apiClient';
import useAppStore from '../store/useAppStore';
import { TrendingUp, TrendingDown, Plus, CheckCircle2, Trash2, Loader2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const PAGE_SIZE = 20;

const fmt = (n, d = 2) => {
  if (n == null) return '—';
  return parseFloat(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
};

const TABS = ['Open', 'Closed', 'All'];

const Pagination = ({ page, totalPages, onPage }) => {
  if (totalPages <= 1) return null;
  return (
    <div className={styles.pagination}>
      <button className={styles.pageBtn} onClick={() => onPage(page - 1)} disabled={page <= 1}><ChevronLeft size={14} /></button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
        const p = totalPages <= 7 ? i + 1 : Math.max(1, page - 3) + i;
        if (p > totalPages) return null;
        return (
          <button key={p} className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`} onClick={() => onPage(p)}>{p}</button>
        );
      })}
      <button className={styles.pageBtn} onClick={() => onPage(page + 1)} disabled={page >= totalPages}><ChevronRight size={14} /></button>
    </div>
  );
};

const CloseTradeModal = ({ trade, onClose, onConfirm, loading }) => {
  const [exitPrice, setExitPrice] = useState(String(trade?.entryPrice || ''));
  if (!trade) return null;
  return (
    <div className={styles.modalOverlay} onClick={() => onClose()}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>Close Trade</h3>
        <p className={styles.modalSub}>{trade.symbol} {trade.direction === 0 || trade.direction === 'Long' ? 'Long' : 'Short'} · Entry {fmt(trade.entryPrice)}</p>
        <div className={styles.modalField}>
          <label>Exit Price</label>
          <input type="number" step="any" value={exitPrice} onChange={e => setExitPrice(e.target.value)} className={styles.modalInput} autoFocus />
        </div>
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.confirmCloseBtn}
            onClick={() => onConfirm(trade.id, parseFloat(exitPrice))}
            disabled={loading || !exitPrice}
          >
            {loading ? <><Loader2 size={12} className={styles.spin} /> Closing...</> : 'Close Position'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TradesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openTradeForm, updateOpenTrade, removeOpenTrade } = useAppStore();

  const tabParam = searchParams.get('tab') || 'open';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const activeTab = TABS.find(t => t.toLowerCase() === tabParam) || 'Open';

  const [trades,     setTrades]     = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [closingTrade, setClosingTrade] = useState(null);
  const [closingLoading, setClosingLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchTrades = useCallback(async (tab, page) => {
    setLoading(true);
    setError(null);
    try {
      const status = tab === 'All' ? undefined : tab;
      const data = await TradeService.list({ ...(status ? { status } : {}), page, pageSize: PAGE_SIZE });
      setTrades(data.items || data || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError('Failed to load trades.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades(activeTab, currentPage);
  }, [activeTab, currentPage, fetchTrades]);

  const setTab = (tab) => {
    setSearchParams({ tab: tab.toLowerCase() });
  };

  const goPage = (p) => {
    setSearchParams({ tab: activeTab.toLowerCase(), ...(p > 1 ? { page: String(p) } : {}) });
  };

  const handleCloseConfirm = async (id, exitPrice) => {
    setClosingLoading(true);
    try {
      const updated = await TradeService.close(id, { exitPrice });
      setTrades(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
      updateOpenTrade(id, updated);
      setClosingTrade(null);
    } catch {
      setError('Failed to close trade.');
    } finally {
      setClosingLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this trade?')) return;
    setDeletingId(id);
    try {
      await TradeService.remove(id);
      setTrades(prev => prev.filter(t => t.id !== id));
      removeOpenTrade(id);
      setTotalCount(c => c - 1);
    } catch {
      setError('Failed to delete trade.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Trade Journal</h2>
        <button
          className={styles.newBtn}
          onClick={() => openTradeForm(null)}
        >
          <Plus size={14} /> New Trade
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setTab(tab)}
          >
            {tab}
          </button>
        ))}
        <span className={styles.tabCount}>{totalCount} trades</span>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Direction</th>
              <th>Symbol</th>
              <th>Entry</th>
              <th>Amount</th>
              <th>SL / TP</th>
              <th>Leverage</th>
              <th>Date</th>
              <th>PnL</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className={styles.loadingRow}><Loader2 size={15} className={styles.spin} /> Loading...</td></tr>
            )}
            {!loading && trades.length === 0 && (
              <tr><td colSpan={9} className={styles.emptyRow}>No {activeTab.toLowerCase()} trades found.</td></tr>
            )}
            {!loading && trades.map(t => {
              const isLong  = t.direction === 0 || t.direction === 'Long';
              const isOpen  = t.status === 0 || t.status === 'Open';
              const pnl     = t.pnlQuote;
              const profit  = pnl != null && pnl > 0;
              const loss    = pnl != null && pnl < 0;
              return (
                <tr key={t.id} className={styles.row}>
                  <td>
                    <span className={isLong ? styles.long : styles.short}>
                      {isLong ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {isLong ? 'Long' : 'Short'}
                    </span>
                  </td>
                  <td>
                    <span className={styles.symbol}>{t.symbol}</span>
                    {t.analysisId && (
                      <Link to={`/analysis/${t.analysisId}`} className={styles.analysisLink} title="View linked analysis">
                        <ExternalLink size={10} />
                      </Link>
                    )}
                  </td>
                  <td className={styles.mono}>{fmt(t.entryPrice)}</td>
                  <td className={styles.mono}>{fmt(t.entryAmount)}</td>
                  <td className={styles.mono}>
                    {t.stopLoss   ? <span className={styles.sl}>{fmt(t.stopLoss)}</span>   : '—'}
                    {' / '}
                    {t.takeProfit ? <span className={styles.tp}>{fmt(t.takeProfit)}</span> : '—'}
                  </td>
                  <td className={styles.mono}>{t.leverage ?? 1}×</td>
                  <td className={styles.dateCell}>{new Date(t.entryAt || t.createdAt).toLocaleDateString()}</td>
                  <td>
                    {pnl != null ? (
                      <span className={`${styles.pnl} ${profit ? styles.green : loss ? styles.red : ''}`}>
                        {profit ? '+' : ''}{fmt(pnl)}
                        {t.pnlPercentage != null && (
                          <span className={styles.pnlPct}> ({profit ? '+' : ''}{fmt(t.pnlPercentage)}%)</span>
                        )}
                      </span>
                    ) : (
                      <span className={styles.openBadge}>Open</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      {isOpen && (
                        <button
                          className={styles.closeBtn}
                          onClick={() => setClosingTrade(t)}
                          title="Close trade"
                        >
                          <CheckCircle2 size={12} /> Close
                        </button>
                      )}
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        title="Delete trade"
                      >
                        {deletingId === t.id ? <Loader2 size={12} className={styles.spin} /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={currentPage} totalPages={totalPages} onPage={goPage} />

      {/* Close trade modal */}
      <CloseTradeModal
        trade={closingTrade}
        onClose={() => setClosingTrade(null)}
        onConfirm={handleCloseConfirm}
        loading={closingLoading}
      />
    </div>
  );
};

export default TradesPage;
