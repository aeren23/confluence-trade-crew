import React from 'react';
import styles from './LandingPage.module.css';

const AcademyPage = () => {
  return (
    <div className={styles.landingContainer} style={{ minHeight: 'auto' }}>
      {/* AI Pipeline Section */}
      <section className={styles.pipelineSection} style={{ paddingTop: '2rem' }}>
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
    </div>
  );
};

export default AcademyPage;
