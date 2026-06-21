import React from 'react';
import { useNavigate } from 'react-router-dom';
import ControlPanel from '../components/Analysis/ControlPanel';
import TradingChart from '../components/Chart/TradingChart';
import SynthesisPanel from '../components/Analysis/SynthesisPanel';
import OpenTrades from '../components/Trade/OpenTrades';
import AlertWidget from '../components/Analysis/AlertWidget';
import TelemetryConsole from '../components/Analysis/TelemetryConsole';
import useAppStore from '../store/useAppStore';

const DashboardPage = () => {
  const { finalAnalysis } = useAppStore();
  const navigate = useNavigate();

  // When an analysis completes and has a saved ID, allow navigating to its detail page
  const handleViewAnalysis = () => {
    const id = finalAnalysis?._meta?.id;
    if (id) navigate(`/analysis/${id}`);
  };

  return (
    <>
      {/* Top Section: Controls and Chart */}
      <div style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <ControlPanel />
        </div>
        <div style={{ flex: '2 1 600px' }}>
          <TradingChart />
        </div>
      </div>

      {/* Open Trades and Alerts */}
      <div style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <div style={{ flex: '2 1 600px' }}>
          <OpenTrades />
        </div>
        <div style={{ flex: '1 1 300px' }}>
          <AlertWidget />
        </div>
      </div>

      {/* Live Telemetry Console */}
      <TelemetryConsole />

      {/* Final Analysis Panel */}
      <SynthesisPanel onViewAnalysis={handleViewAnalysis} />
    </>
  );
};

export default DashboardPage;
