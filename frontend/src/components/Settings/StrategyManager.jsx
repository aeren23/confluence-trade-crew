import React, { useState, useEffect } from 'react';
import { StrategyService } from '../../services/apiClient';
import { Loader2, Plus, Trash2, SlidersHorizontal, Info } from 'lucide-react';
import styles from './StrategyManager.module.css';

const TIMEFRAMES = ['1m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w'];
const RISK_PROFILES = ['conservative', 'moderate', 'aggressive', 'neutral'];

const StrategyManager = () => {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    displayName: '',
    description: '',
    iconEmoji: '🧪',
    colorHex: '#8b5cf6',
    riskProfile: 'moderate',
    minimumRR: 1.5,
    newsWeight: 0.1,
    timeframes: [],
    timeframeWeights: {}
  });

  const fetchStrategies = async () => {
    try {
      const data = await StrategyService.getAll();
      setStrategies(data);
    } catch (err) {
      setError('Failed to fetch strategies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  const handleCheckboxChange = (tf) => {
    const isChecked = form.timeframes.includes(tf);
    const newTfs = isChecked 
      ? form.timeframes.filter(t => t !== tf)
      : [...form.timeframes, tf];
    
    // Sort timeframes according to the master list
    newTfs.sort((a, b) => TIMEFRAMES.indexOf(a) - TIMEFRAMES.indexOf(b));
    
    const newWeights = { ...form.timeframeWeights };
    if (isChecked) {
      delete newWeights[tf];
    } else {
      newWeights[tf] = 1.0; // temporary equal weighting
    }
    
    // normalize weights
    const keys = Object.keys(newWeights);
    keys.forEach(k => {
      newWeights[k] = parseFloat((1.0 / keys.length).toFixed(2));
    });

    setForm({ ...form, timeframes: newTfs, timeframeWeights: newWeights });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) { setError('System Name (Internal) is required.'); return; }
    if (!form.displayName) { setError('Display Name is required.'); return; }
    if (form.timeframes.length === 0) { setError('Please select at least one timeframe.'); return; }
    
    setSaving(true);
    setError(null);
    
    const parsedRR = parseFloat(form.minimumRR);
    const parsedNews = parseFloat(form.newsWeight);

    const payload = {
      ...form,
      minimumRR: isNaN(parsedRR) ? 1.5 : parsedRR,
      newsWeight: isNaN(parsedNews) ? 0.1 : parsedNews
    };

    console.log('Attempting to save strategy payload:', payload);
    try {
      await StrategyService.create(payload);
      setShowForm(false);
      setForm({
        name: '', displayName: '', description: '', iconEmoji: '🧪', colorHex: '#8b5cf6',
        riskProfile: 'moderate', minimumRR: 1.5, newsWeight: 0.1, timeframes: [], timeframeWeights: {}
      });
      fetchStrategies();
    } catch (err) {
      console.error("Strategy save error:", err);
      let msg = err.message || 'Failed to save strategy';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          msg = err.response.data;
        } else if (err.response.data.error) {
          msg = err.response.data.error;
        } else if (err.response.data.title) {
          msg = err.response.data.title;
          if (err.response.data.errors) {
            msg += ' | ' + Object.values(err.response.data.errors).flat().join(' | ');
          }
        }
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this custom strategy?')) return;
    try {
      await StrategyService.remove(id);
      fetchStrategies();
    } catch {
      setError('Failed to delete strategy');
    }
  };

  if (loading) return <div className={styles.centered}><Loader2 className={styles.spin} /> Loading strategies...</div>;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>Custom Strategy Builder</h3>
          <p className={styles.cardDesc}>Create personalized AI personas that prioritize specific timeframes, risk parameters, and news weights.</p>
        </div>
        {!showForm && (
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>
            <Plus size={14} /> New Strategy
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {showForm && (
        <form className={styles.builderForm} onSubmit={handleSave} noValidate>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>System Name (Internal)</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value.toLowerCase().replace(/\s/g, '_')})} placeholder="e.g. my_scalp" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Display Name</label>
              <input type="text" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value, name: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_')})} placeholder="e.g. My Custom Scalp" className={styles.input} />
            </div>
            
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Emoji Icon</label>
                <input type="text" value={form.iconEmoji} onChange={e => setForm({...form, iconEmoji: e.target.value})} className={`${styles.input} ${styles.shortInput}`} />
              </div>
              <div className={styles.field}>
                <label>Color</label>
                <input type="color" value={form.colorHex} onChange={e => setForm({...form, colorHex: e.target.value})} className={styles.colorInput} />
              </div>
            </div>

            <div className={styles.fieldFull}>
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows="2" placeholder="Describe what this AI is supposed to do..." className={styles.input} />
            </div>

            <div className={styles.sliderField}>
              <label>
                News Weight
                <span className={styles.hint}>{(form.newsWeight * 100).toFixed(0)}% News / {((1 - form.newsWeight) * 100).toFixed(0)}% TA & On-Chain</span>
              </label>
              <input type="range" min="0" max="1" step="0.05" value={form.newsWeight} onChange={e => setForm({...form, newsWeight: parseFloat(e.target.value)})} className={styles.slider} />
              <p className={styles.helpText}>Determine how much macro news affects the AI's final sentiment.</p>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>Min R:R</label>
                <input type="number" min="0.1" max="100" step="0.1" value={form.minimumRR} onChange={e => setForm({...form, minimumRR: e.target.value})} className={styles.input} />
                <p className={styles.helpText}>Risk/Reward ratio. e.g., at 1.5, the AI will only approve trades where it can earn at least $1.50 for every $1 at risk.</p>
              </div>
              <div className={styles.field}>
                <label>Risk Profile</label>
                <select value={form.riskProfile} onChange={e => setForm({...form, riskProfile: e.target.value})} className={styles.input}>
                  {RISK_PROFILES.map(rp => <option key={rp} value={rp}>{rp}</option>)}
                </select>
                <p className={styles.helpText}>Determines the AI's stop-loss tolerance and trade frequency.</p>
              </div>
            </div>

            <div className={styles.fieldFull}>
              <label>Timeframes (Check to include)</label>
              <div className={styles.checkboxGrid}>
                {TIMEFRAMES.map(tf => (
                  <label key={tf} className={styles.checkboxLabel}>
                    <input type="checkbox" checked={form.timeframes.includes(tf)} onChange={() => handleCheckboxChange(tf)} />
                    {tf}
                  </label>
                ))}
              </div>
              <p className={styles.helpText}>Selected timeframes will be automatically evenly weighted across the AI agents.</p>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? <Loader2 size={14} className={styles.spin} /> : 'Save Strategy'}
            </button>
          </div>
        </form>
      )}

      <div className={styles.strategyList}>
        {strategies.map(s => (
          <div key={s.id} className={`${styles.strategyRow} ${s.isPreset ? styles.presetRow : ''}`}>
            <div className={styles.strategyAvatar} style={{ background: s.colorHex }}>{s.iconEmoji}</div>
            <div className={styles.strategyInfoRow}>
              <div className={styles.strategyTitleRow}>
                <h4>{s.displayName}</h4>
                {s.isPreset && <span className={styles.presetBadge}>Preset</span>}
              </div>
              <p className={styles.strategyDesc}>{s.description}</p>
              <div className={styles.strategyTags}>
                <span>R:R ≥ {s.minimumRR}</span>
                <span>News {(s.newsWeight * 100).toFixed(0)}%</span>
                <span>{s.timeframes.join(' → ')}</span>
              </div>
            </div>
            {!s.isPreset && (
              <button className={styles.deleteBtn} onClick={() => handleDelete(s.id)} title="Delete strategy">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StrategyManager;
