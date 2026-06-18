import React from 'react';
import styles from './MainLayout.module.css';
import { Activity, LayoutDashboard, Settings } from 'lucide-react';

const MainLayout = ({ children }) => {
  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}></div>
          <span className={styles.logoText}>CTC</span>
        </div>
        <nav className={styles.nav}>
          <button className={`${styles.navItem} ${styles.active}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button className={styles.navItem}>
            <Activity size={20} />
            <span>History</span>
          </button>
          <button className={styles.navItem}>
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.pageTitle}>AI Analysis Dashboard</h1>
            <div className={styles.statusBadge}>
              <span className={styles.pulseIndicator}></span>
              System Online
            </div>
          </div>
        </header>
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
