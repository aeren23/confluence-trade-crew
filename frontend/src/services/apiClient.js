import axios from 'axios';

// Abstracted Axios instance for clean architecture
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const AnalysisService = {
  triggerAnalysis: async (payload) => {
    const response = await apiClient.post('/api/analysis', payload);
    return response.data;
  },
};

export default apiClient;
