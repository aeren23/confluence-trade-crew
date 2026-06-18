import { create } from 'zustand';

const useAppStore = create((set) => ({
  // Form State
  symbol: 'BTC/USDT',
  timeframe: '4h',
  balance: 1000,
  riskPercentage: 2,
  
  // App State
  analysisStatus: 'idle', // idle, loading, complete, error
  telemetryLogs: [],
  finalAnalysis: null,
  error: null,

  // Actions
  setSymbol: (symbol) => set({ symbol }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setBalance: (balance) => set({ balance }),
  setRiskPercentage: (riskPercentage) => set({ riskPercentage }),
  
  setAnalysisStatus: (status) => set({ analysisStatus: status }),
  setError: (error) => set({ error, analysisStatus: 'error' }),
  
  addTelemetryLog: (log) => set((state) => ({ 
    telemetryLogs: [...state.telemetryLogs, log] 
  })),
  
  clearTelemetryLogs: () => set({ telemetryLogs: [] }),
  
  setFinalAnalysis: (analysis) => set({ 
    finalAnalysis: analysis, 
    analysisStatus: 'complete' 
  }),
}));

export default useAppStore;
