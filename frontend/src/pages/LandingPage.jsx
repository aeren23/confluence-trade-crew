import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleLaunchApp = () => {
    navigate('/dashboard');
  };

  return (
    <div className={styles.landingContainer}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}></div>
          <span className={styles.logoText}>Confluence Trade Crew</span>
        </div>
        <button className={styles.navButton} onClick={handleLaunchApp}>
          Launch App
        </button>
      </nav>

      {/* Hero Section */}
      <header className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>Institutional-Grade AI Trading Pipeline</div>
          <h1 className={styles.heroTitle}>
            Remove Emotions.<br />
            <span className={styles.highlight}>Inject Statistics.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            A sophisticated crew of AI agents working together to analyze Technicals, Fundamentals, and On-Chain data with strict risk management.
          </p>
          <button className={styles.primaryButton} onClick={handleLaunchApp}>
            Start Simulating Free
          </button>
        </div>
      </header>

      {/* AI Pipeline Section */}
      <section className={styles.pipelineSection}>
        <div className={styles.sectionHeader}>
          <h2>The AI Pipeline</h2>
          <p>Not a single bot, but a committee of specialized agents.</p>
        </div>
        <div className={styles.gridContainer}>
          <div className={styles.agentCard}>
            <div className={styles.agentIcon}>📊</div>
            <h3>Technical Agent</h3>
            <p>Analyzes price action, momentum, and volume across multiple timeframes simultaneously.</p>
          </div>
          <div className={styles.agentCard}>
            <div className={styles.agentIcon}>📰</div>
            <h3>Fundamental Agent</h3>
            <p>Monitors global news, sentiment, and macroeconomic indicators in real-time.</p>
          </div>
          <div className={styles.agentCard}>
            <div className={styles.agentIcon}>🔗</div>
            <h3>On-Chain Agent</h3>
            <p>Tracks whale movements, exchange flows, and network health directly from the blockchain.</p>
          </div>
          <div className={styles.agentCard}>
            <div className={styles.agentIcon}>🛡️</div>
            <h3>Risk Agent</h3>
            <p>Calculates exact position sizes, sets tight stop-losses, and enforces maximum drawdown limits.</p>
          </div>
          <div className={styles.agentCard + ' ' + styles.orchestratorCard}>
            <div className={styles.agentIcon}>🧠</div>
            <h3>Orchestrator</h3>
            <p>Synthesizes insights from all agents to make the final, emotionless trading decision.</p>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className={styles.philosophySection}>
        <div className={styles.sectionHeader}>
          <h2>Trading Philosophy</h2>
          <p>We don't sell dreams of 100x overnight. We sell survival and consistent compounding.</p>
        </div>
        <div className={styles.philosophyGrid}>
          <div className={styles.philCard}>
            <h3>The Power of 2% Risk</h3>
            <p>Leverage doesn't matter, Risk Amount does. By risking only 2% per trade, you can survive the inevitable losing streaks. A 10% risk will lead to mathematical ruin.</p>
          </div>
          <div className={styles.philCard}>
            <h3>R:R 2.0 Logic</h3>
            <p>You don't need a 90% win rate. With a strict 1:2 Risk-to-Reward ratio, you can lose 60% of your trades and still be highly profitable at the end of the month.</p>
          </div>
          <div className={styles.philCard}>
            <h3>Transparent Backtesting</h3>
            <p>Test any strategy with our high-speed, vectorized backtest engine. See your exact equity curve, drawdowns, and fees paid before risking real capital.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>Confluence Trade Crew</div>
          <div className={styles.footerText}>
            © {new Date().getFullYear()} Confluence Trade Crew. All rights reserved. <br/>
            Trading cryptocurrencies involves significant risk. Our AI provides analysis and simulation, not financial advice.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
