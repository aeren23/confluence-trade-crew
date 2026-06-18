import { v4 as uuidv4 } from 'uuid';
import useAppStore from '../store/useAppStore';
import { AnalysisService } from '../services/apiClient';
import signalrClient from '../services/signalrClient';

/**
 * Custom hook encapsulating the business logic for triggering an analysis.
 * Adheres to Clean Architecture by separating the API and Store from the UI components.
 */
export const useAnalysisLogic = () => {
  const store = useAppStore();

  const handleRunAnalysis = async () => {
    // Prevent overlapping requests
    if (store.analysisStatus === 'loading') return;

    // Generate a unique session ID for this request's telemetry
    const sessionId = uuidv4();

    // 1. Reset state
    store.clearTelemetryLogs();
    store.setAnalysisStatus('loading');
    store.setError(null);
    store.setFinalAnalysis(null);

    try {
      // 2. Connect to SignalR with the new sessionId to receive live telemetry
      await signalrClient.connect(sessionId);
      
      signalrClient.onSystemMessage((msg) => {
        store.addTelemetryLog({ type: 'system', message: msg, agent: 'System', timestamp: new Date().toISOString() });
      });

      signalrClient.onTelemetryReceived((telemetryData) => {
        // telemetryData shape: { sessionId, agent, type, message }
        store.addTelemetryLog({
          ...telemetryData,
          timestamp: new Date().toISOString()
        });
      });

      // 3. Trigger the analysis via the .NET API
      const payload = {
        symbol: store.symbol,
        timeframe: store.timeframe,
        balance: store.balance,
        riskPercentage: store.riskPercentage,
        sessionId: sessionId,
      };

      const result = await AnalysisService.triggerAnalysis(payload);

      // 4. Handle success
      // The API returns AnalysisResponseDto which contains a stringified 'resultJson'
      const parsedResult = JSON.parse(result.resultJson);
      store.setFinalAnalysis(parsedResult);

    } catch (err) {
      console.error('Analysis failed', err);
      store.setError(err.response?.data?.detail || err.message || 'Analysis failed due to an unknown error.');
    } finally {
      // Clean up the SignalR connection once analysis is complete or fails
      await signalrClient.disconnect();
    }
  };

  return {
    runAnalysis: handleRunAnalysis,
    status: store.analysisStatus,
    error: store.error
  };
};
