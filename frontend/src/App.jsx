import React from 'react';
import MainLayout from './components/Layout/MainLayout';
import ControlPanel from './components/Analysis/ControlPanel';
import TradingChart from './components/Chart/TradingChart';
import TelemetryConsole from './components/Analysis/TelemetryConsole';
import SynthesisPanel from './components/Analysis/SynthesisPanel';

/**
 * App — Root application component.
 * Assembles the Clean Architecture presentation components.
 */
function App() {
  return (
    <MainLayout>
      {/* Top Section: Controls and Chart */}
      <div style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <ControlPanel />
        </div>
        <div style={{ flex: '2 1 600px' }}>
          <TradingChart />
        </div>
      </div>

      {/* Middle Section: Telemetry Console */}
      <TelemetryConsole />

      {/* Bottom Section: Final Analysis Panel */}
      <SynthesisPanel />
    </MainLayout>
  );
}

export default App;
