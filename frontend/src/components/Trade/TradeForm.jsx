import React, { useState, useEffect } from 'react';
import styles from './TradeForm.module.css';
import useAppStore from '../../store/useAppStore';
import { TradeService } from '../../services/apiClient';
import { X, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

const PRESET_TAGS = ['breakout', 'reversal', 'trend', 'scalp', 'news-driven', 'support', 'resistance'];

const TradeForm = () => {
  const { tradeFormOpen, pendingTradeDefaults, closeTradeForm, addOpenTrade } = useAppStore();

  const [form, setForm] = useState({
    symbol: '',
    direction: 'Long',
    entryPrice: '',
    entryAmount: '',
    leverage: 1,
    stopLoss: '',
    takeProfit: '',
    notes: '',
    tags: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Pre-fill from analysis defaults when form opens
  useEffect(() => {
    if (tradeFormOpen && pendingTradeDefaults) {
      setForm((prev) => ({
        ...prev,
        symbol: pendingTradeDefaults.symbol || prev.symbol,
        direction: pendingTradeDefaults.direction || 'Long',
        entryPrice: pendingTradeDefaults.entryPrice || '',
        entryAmount: pendingTradeDefaults.entryAmount || '',
        leverage: pendingTradeDefaults.leverage || 1,
        stopLoss: pendingTradeDefaults.stopLoss || '',
        takeProfit: pendingTradeDefaults.takeProfit || '',
      }));
    }
    if (tradeFormOpen) setError(null);
  }, [tradeFormOpen, pendingTradeDefaults]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        symbol: form.symbol,
        direction: form.direction === 'Long' ? 0 : 1, // TradeDirection enum: Long=0, Short=1
        entryPrice: parseFloat(form.entryPrice),
        entryAmount: parseFloat(form.entryAmount),
        leverage: parseFloat(form.leverage) || 1,
        stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : null,
        takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : null,
        analysisId: pendingTradeDefaults?.analysisId || null,
        notes: form.notes || null,
        tags: form.tags.length > 0 ? form.tags.join(',') : null,
      };
      const created = await TradeService.create(payload);
      addOpenTrade(created);
      closeTradeForm();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create trade.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!tradeFormOpen) return null;

  const isLong = form.direction === 'Long';

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeTradeForm()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>
            {isLong
              ? <><TrendingUp size={15} className={styles.bullish} /> Open Long</>
              : <><TrendingDown size={15} className={styles.bearish} /> Open Short</>
            }
          </span>
          {pendingTradeDefaults?.analysisId && (
            <span className={styles.linkedBadge}>Linked to Analysis</span>
          )}
          <button className={styles.closeBtn} onClick={closeTradeForm}>
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Direction toggle */}
          <div className={styles.fieldGroup}>
            <label>Direction</label>
            <div className={styles.dirToggle}>
              <button
                type="button"
                className={`${styles.dirBtn} ${isLong ? styles.dirBtnLong : ''}`}
                onClick={() => handleChange('direction', 'Long')}
              >
                <TrendingUp size={13} /> Long
              </button>
              <button
                type="button"
                className={`${styles.dirBtn} ${!isLong ? styles.dirBtnShort : ''}`}
                onClick={() => handleChange('direction', 'Short')}
              >
                <TrendingDown size={13} /> Short
              </button>
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.fieldGroup}>
              <label>Symbol</label>
              <input
                type="text"
                value={form.symbol}
                onChange={(e) => handleChange('symbol', e.target.value)}
                required
                className={styles.input}
                placeholder="BTC/USDT"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Entry Price</label>
              <input
                type="number"
                step="any"
                value={form.entryPrice}
                onChange={(e) => handleChange('entryPrice', e.target.value)}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Amount (USDT)</label>
              <input
                type="number"
                step="any"
                value={form.entryAmount}
                onChange={(e) => handleChange('entryAmount', e.target.value)}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Leverage</label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={form.leverage}
                onChange={(e) => handleChange('leverage', e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Stop Loss</label>
              <input
                type="number"
                step="any"
                value={form.stopLoss}
                onChange={(e) => handleChange('stopLoss', e.target.value)}
                className={styles.input}
                placeholder="Optional"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Take Profit</label>
              <input
                type="number"
                step="any"
                value={form.takeProfit}
                onChange={(e) => handleChange('takeProfit', e.target.value)}
                className={styles.input}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Optional trade notes..."
              rows={2}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Tags</label>
            <div className={styles.tagChips}>
              {PRESET_TAGS.map((tag) => {
                const active = form.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`${styles.tagChip} ${active ? styles.tagChipActive : ''}`}
                    onClick={() =>
                      handleChange(
                        'tags',
                        active ? form.tags.filter((t) => t !== tag) : [...form.tags, tag]
                      )
                    }
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={closeTradeForm}>
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.submitBtn} ${isLong ? styles.submitLong : styles.submitShort}`}
              disabled={submitting}
            >
              {submitting ? <><Loader2 size={13} className={styles.spin} /> Saving...</> : `Open ${form.direction}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TradeForm;
