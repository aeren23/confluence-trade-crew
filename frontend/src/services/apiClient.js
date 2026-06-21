import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

// ── Analysis ────────────────────────────────────────────────────────────────
export const AnalysisService = {
  triggerAnalysis: (payload) =>
    apiClient.post('/api/analysis', payload).then((r) => r.data),

  getList: (page = 1, pageSize = 20, symbol = '') =>
    apiClient
      .get('/api/analysis', { params: { page, pageSize, ...(symbol ? { symbol } : {}) } })
      .then((r) => r.data),

  getById: (id) =>
    apiClient.get(`/api/analysis/${id}`).then((r) => r.data),
};

// ── Settings ─────────────────────────────────────────────────────────────────
export const SettingsService = {
  get: () =>
    apiClient.get('/api/settings').then((r) => r.data),

  update: (payload) =>
    apiClient.put('/api/settings', payload).then((r) => r.data),
};

// ── Pairs ─────────────────────────────────────────────────────────────────────
export const PairService = {
  getAll: () =>
    apiClient.get('/api/pair').then((r) => r.data),

  create: (symbol, quoteAsset = 'USDT') =>
    apiClient.post('/api/pair', { symbol, quoteAsset }).then((r) => r.data),
};

// ── Portfolio ─────────────────────────────────────────────────────────────────
export const PortfolioService = {
  getSummary: () =>
    apiClient.get('/api/portfolio/summary').then((r) => r.data),
};

// ── Trades ────────────────────────────────────────────────────────────────────
export const TradeService = {
  create: (payload) =>
    apiClient.post('/api/trade', payload).then((r) => r.data),

  list: (params = {}) =>
    apiClient.get('/api/trade', { params }).then((r) => r.data),

  close: (id, payload) =>
    apiClient.put(`/api/trade/${id}/close`, payload).then((r) => r.data),

  remove: (id) =>
    apiClient.delete(`/api/trade/${id}`).then((r) => r.data),

  byAnalysis: (analysisId) =>
    apiClient.get(`/api/trade/by-analysis/${analysisId}`).then((r) => r.data),
};

export default apiClient;
