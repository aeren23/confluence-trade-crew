import React, { useEffect, useState } from 'react';
import styles from './SettingsPage.module.css';
import { SettingsService, PairService } from '../services/apiClient';
import useAppStore from '../store/useAppStore';
import { Save, CheckCircle2, Loader2, AlertTriangle, Plus } from 'lucide-react';

const TIMEFRAMES = ['1m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w'];

const SettingsPage = () => {
  const { setSettings } = useAppStore();

  const [form,       setForm]       = useState({ defaultBalance: 1000, defaultRiskPercentage: 1, preferredTimeframe: '4h', riskProfile: 'moderate' });
  const [pairs,      setPairs]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState(null);
  const [newSymbol,  setNewSymbol]  = useState('');
  const [addingPair, setAddingPair] = useState(false);
  const [addPairErr, setAddPairErr] = useState(null);

  useEffect(() => {
    Promise.all([
      SettingsService.get(),
      PairService.getAll(),
    ])
      .then(([settings, pairList]) => {
        setForm({
          defaultBalance:         settings.defaultBalance         ?? 1000,
          defaultRiskPercentage:  settings.defaultRiskPercentage  ?? 1,
          preferredTimeframe:     settings.preferredTimeframe     ?? '4h',
          riskProfile:            settings.riskProfile            ?? 'moderate',
        });
        setPairs(pairList || []);
      })
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await SettingsService.update(form);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const riskAmount = ((form.defaultBalance || 0) * (form.defaultRiskPercentage || 0) / 100).toFixed(2);

  const handleAddPair = async (e) => {
    e.preventDefault();
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) return;
    setAddingPair(true);
    setAddPairErr(null);
    try {
      const pair = await PairService.create(symbol);
      setPairs(prev => prev.some(p => p.symbol === pair.symbol) ? prev : [...prev, pair]);
      setNewSymbol('');
    } catch {
      setAddPairErr('Failed to add pair. Make sure the symbol is valid (e.g. ETHUSDT).');
    } finally {
      setAddingPair(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.centered}>
        <Loader2 size={22} className={styles.spin} /> Loading settings...
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <form className={styles.form} onSubmit={handleSave}>
        {/* Trading defaults card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Trading Defaults</h3>
          <p className={styles.cardDesc}>These values pre-fill the analysis control panel and trade form.</p>

          <div className={styles.fieldsGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Default Portfolio Balance (USDT)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.defaultBalance}
                onChange={e => handleChange('defaultBalance', parseFloat(e.target.value) || 0)}
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Default Risk Per Trade (%)
                <span className={styles.hint}> = {riskAmount} USDT at risk</span>
              </label>
              <div className={styles.sliderRow}>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={form.defaultRiskPercentage}
                  onChange={e => handleChange('defaultRiskPercentage', parseFloat(e.target.value))}
                  className={styles.slider}
                />
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={form.defaultRiskPercentage}
                  onChange={e => handleChange('defaultRiskPercentage', parseFloat(e.target.value) || 0)}
                  className={`${styles.input} ${styles.inputNarrow}`}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Preferred Timeframe</label>
              <select
                value={form.preferredTimeframe}
                onChange={e => handleChange('preferredTimeframe', e.target.value)}
                className={styles.select}
              >
                {TIMEFRAMES.map(tf => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Risk Profile card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Trading Style</h3>
          <p className={styles.cardDesc}>
            Controls how aggressively the AI agent interprets signals. Affects R:R thresholds, neutral zone width, and WAIT frequency.
          </p>
          <div className={styles.profileGrid}>
            {[
              {
                value: 'conservative',
                label: 'Conservative',
                sub: 'R:R min 1.0 · Full size at 1.5 · Tight neutral zone',
                detail: 'WAIT-heavy. Only enters with strong setups.',
              },
              {
                value: 'moderate',
                label: 'Moderate',
                sub: 'R:R min 0.8 · Full size at 1.2 · Balanced neutral zone',
                detail: 'Balanced. Allows slightly imperfect R:R at reduced size.',
              },
              {
                value: 'aggressive',
                label: 'Aggressive',
                sub: 'R:R min 0.6 · Full size at 1.0 · Wide neutral zone',
                detail: 'Trade-heavy. Enters on momentum even with tight reward.',
              },
            ].map(({ value, label, sub, detail }) => (
              <div
                key={value}
                className={`${styles.profileCard} ${form.riskProfile === value ? styles.profileCardActive : ''}`}
                onClick={() => handleChange('riskProfile', value)}
              >
                <div className={styles.profileHeader}>
                  <span className={styles.profileRadio}>{form.riskProfile === value ? '●' : '○'}</span>
                  <span className={styles.profileLabel}>{label}</span>
                </div>
                <span className={styles.profileSub}>{sub}</span>
                <span className={styles.profileDetail}>{detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pair management card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Tracked Pairs</h3>
          <p className={styles.cardDesc}>Add or view the trading pairs available in analysis and the control panel.</p>

          {/* Add new pair */}
          <div className={styles.addPairRow}>
            <input
              type="text"
              placeholder="e.g. ETHUSDT or ETH/USDT"
              value={newSymbol}
              onChange={e => { setNewSymbol(e.target.value); setAddPairErr(null); }}
              className={`${styles.input} ${styles.addPairInput}`}
            />
            <button type="button" className={styles.addPairBtn} disabled={addingPair || !newSymbol.trim()} onClick={handleAddPair}>
              {addingPair ? <Loader2 size={13} className={styles.spin} /> : <Plus size={13} />}
              {addingPair ? 'Adding…' : 'Add Pair'}
            </button>
          </div>
          {addPairErr && <div className={styles.addPairErr}>{addPairErr}</div>}

          {/* Pair list */}
          {pairs.length > 0 && (
            <div className={styles.pairList}>
              {pairs.map(p => (
                <div key={p.symbol} className={styles.pairRow}>
                  <span className={styles.pairSymbol}>{p.symbol}</span>
                  <span className={`${styles.pairStatus} ${p.isActive ? styles.active : styles.inactive}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
          {pairs.length === 0 && !loading && (
            <div className={styles.pairEmpty}>No pairs yet. Add one above.</div>
          )}
        </div>

        {/* Error / Save */}
        {error && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className={styles.saveRow}>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? (
              <><Loader2 size={14} className={styles.spin} /> Saving...</>
            ) : saved ? (
              <><CheckCircle2 size={14} /> Saved!</>
            ) : (
              <><Save size={14} /> Save Settings</>
            )}
          </button>
          {saved && <span className={styles.savedMsg}>Settings saved successfully.</span>}
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
