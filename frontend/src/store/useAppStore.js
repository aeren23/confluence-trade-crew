import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // ── Form / session state ────────────────────────────────────────────────
  symbol: 'BTC/USDT',
  timeframe: '4h',
  balance: 1000,
  riskPercentage: 2,
  riskProfile: 'moderate',  // conservative | moderate | aggressive

  // ── Analysis run state ──────────────────────────────────────────────────
  analysisStatus: 'idle', // idle | loading | complete | error
  telemetryLogs: [],
  finalAnalysis: null,   // { ...parsedResultJson, _meta: { id, createdAt, ... } }
  error: null,
  elapsedSeconds: 0,
  _elapsedTimer: null,

  // ── Settings ────────────────────────────────────────────────────────────
  settingsLoaded: false,

  // ── Trades ──────────────────────────────────────────────────────────────
  openTrades: [],               // TradeResponseDto[]
  tradeFormOpen: false,
  pendingTradeDefaults: null,   // pre-filled values from analysis

  // ── Form actions ────────────────────────────────────────────────────────
  setSymbol: (symbol) => set({ symbol }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setBalance: (balance) => set({ balance }),
  setRiskPercentage: (riskPercentage) => set({ riskPercentage }),
  setRiskProfile: (riskProfile) => set({ riskProfile }),

  // ── Analysis run actions ─────────────────────────────────────────────────
  setAnalysisStatus: (status) => set({ analysisStatus: status }),
  setError: (error) => set({ error, analysisStatus: 'error' }),

  addTelemetryLog: (log) =>
    set((state) => ({ telemetryLogs: [...state.telemetryLogs, log] })),
  clearTelemetryLogs: () => set({ telemetryLogs: [] }),

  setFinalAnalysis: (analysis) => set({ finalAnalysis: analysis, analysisStatus: 'complete' }),

  startElapsedTimer: () => {
    const { _elapsedTimer } = get();
    if (_elapsedTimer) clearInterval(_elapsedTimer);
    const timer = setInterval(() => {
      set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
    }, 1000);
    set({ elapsedSeconds: 0, _elapsedTimer: timer });
  },

  stopElapsedTimer: () => {
    const { _elapsedTimer } = get();
    if (_elapsedTimer) clearInterval(_elapsedTimer);
    set({ _elapsedTimer: null });
  },

  // ── Settings actions ─────────────────────────────────────────────────────
  applySettings: (settings) => set({
    symbol: settings.preferredSymbol || get().symbol,
    balance: settings.defaultBalance ?? get().balance,
    riskPercentage: settings.defaultRiskPercentage ?? get().riskPercentage,
    timeframe: settings.preferredTimeframe || get().timeframe,
    riskProfile: settings.riskProfile || get().riskProfile,
    settingsLoaded: true,
  }),

  setSettings: (settings) => {
    get().applySettings(settings);
  },

  // ── Trades actions ───────────────────────────────────────────────────────
  setOpenTrades: (trades) => set({ openTrades: trades }),

  addOpenTrade: (trade) =>
    set((state) => ({ openTrades: [trade, ...state.openTrades] })),

  updateOpenTrade: (id, updated) =>
    set((state) => ({
      openTrades: state.openTrades.map((t) => (t.id === id ? { ...t, ...updated } : t)),
    })),

  removeOpenTrade: (id) =>
    set((state) => ({ openTrades: state.openTrades.filter((t) => t.id !== id) })),

  openTradeForm: (defaults = null) =>
    set({ tradeFormOpen: true, pendingTradeDefaults: defaults }),

  closeTradeForm: () =>
    set({ tradeFormOpen: false, pendingTradeDefaults: null }),
}));

export default useAppStore;
