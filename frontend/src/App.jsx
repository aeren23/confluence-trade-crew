import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import TradeForm from './components/Trade/TradeForm';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import AnalysisDetailPage from './pages/AnalysisDetailPage';
import PortfolioPage from './pages/PortfolioPage';
import TradesPage from './pages/TradesPage';
import SettingsPage from './pages/SettingsPage';
import ComparePage from './pages/ComparePage';
import BacktestPage from './pages/BacktestPage';
import LandingPage from './pages/LandingPage';
import AcademyPage from './pages/AcademyPage';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/*" element={
          <MainLayout>
            <Routes>
              <Route path="/dashboard"     element={<DashboardPage />} />
              <Route path="/history"       element={<HistoryPage />} />
              <Route path="/analysis/:id"  element={<AnalysisDetailPage />} />
              <Route path="/compare"       element={<ComparePage />} />
              <Route path="/portfolio"     element={<PortfolioPage />} />
              <Route path="/trades"        element={<TradesPage />} />
              <Route path="/backtest"      element={<BacktestPage />} />
              <Route path="/academy"       element={<AcademyPage />} />
              <Route path="/settings"      element={<SettingsPage />} />
              {/* Fallback: redirect unknown paths to dashboard */}
              <Route path="*"              element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </MainLayout>
        } />
      </Routes>

      {/* TradeForm is a global modal, available from any route */}
      <TradeForm />
    </>
  );
}

export default App;
