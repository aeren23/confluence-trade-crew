import { v4 as uuidv4 } from 'uuid';
import { useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import { AnalysisService, SettingsService } from '../services/apiClient';
import signalrClient from '../services/signalrClient';

/**
 * Custom hook encapsulating the business logic for triggering an analysis.
 */
export const useAnalysisLogic = () => {
  const store = useAppStore();

  // Load user settings on first mount
  useEffect(() => {
    if (store.settingsLoaded) return;
    SettingsService.get()
      .then((settings) => store.applySettings(settings))
      .catch(() => {
        // Non-fatal: keep hardcoded defaults
        store.applySettings({});
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRunAnalysis = async () => {
    if (store.analysisStatus === 'loading') return;

    const sessionId = uuidv4();

    store.clearTelemetryLogs();
    store.setAnalysisStatus('loading');
    store.setError(null);
    store.setFinalAnalysis(null);
    store.startElapsedTimer();

    try {
      await signalrClient.connect(sessionId);

      signalrClient.onSystemMessage((msg) => {
        store.addTelemetryLog({
          type: 'system',
          message: msg,
          agent: 'System',
          timestamp: new Date().toISOString(),
        });
      });

      signalrClient.onTelemetryReceived((telemetryData) => {
        store.addTelemetryLog({ ...telemetryData, timestamp: new Date().toISOString() });
      });

      const payload = {
        symbol: store.symbol,
        timeframe: store.timeframe,
        balance: store.balance,
        riskPercentage: store.riskPercentage,
        sessionId,
        riskProfile: store.riskProfile || 'moderate',
        // Include timeframes only when Multi-TF mode is enabled with 2+ selections
        timeframes: store.isMultiTfMode && store.selectedTimeframes.length >= 2
          ? store.selectedTimeframes
          : undefined,
      };

      const result = await AnalysisService.triggerAnalysis(payload);

      const parsedResult = JSON.parse(result.resultJson);

      // Attach the DB record metadata so other components can reference the saved analysis
      store.setFinalAnalysis({
        ...parsedResult,
        _meta: {
          id: result.id,
          createdAt: result.createdAt,
          symbol: result.symbol,
          timeframe: result.timeframe,
          requestedBalance: result.requestedBalance,
          requestedRiskPercentage: result.requestedRiskPercentage,
          overallSentiment: result.overallSentiment,
          overallSentimentScore: result.overallSentimentScore,
          confidence: result.confidence,
        },
      });
    } catch (err) {
      console.error('Analysis failed', err);
      store.setError(
        err.response?.data?.detail || err.message || 'Analysis failed due to an unknown error.'
      );
    } finally {
      store.stopElapsedTimer();
      await signalrClient.disconnect();
    }
  };

  return {
    runAnalysis: handleRunAnalysis,
    status: store.analysisStatus,
    error: store.error,
  };
};
