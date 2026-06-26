import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styles from './MainLayout.module.css';
import { LayoutDashboard, Clock, PieChart, ArrowLeftRight, Settings, History } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { to: '/history',   icon: <Clock size={20} />,           label: 'History'   },
  { to: '/portfolio', icon: <PieChart size={20} />,         label: 'Portfolio' },
  { to: '/trades',    icon: <ArrowLeftRight size={20} />,   label: 'Trades'    },
  { to: '/backtest',  icon: <History size={20} />,          label: 'Backtest'  },
  { to: '/settings',  icon: <Settings size={20} />,         label: 'Settings'  },
];

const PAGE_TITLES = {
  '/dashboard': 'AI Analysis Dashboard',
  '/history':   'Analysis History',
  '/portfolio': 'Portfolio',
  '/trades':    'Trade Journal',
  '/backtest':  'Backtest Simulation',
  '/settings':  'Settings',
};

const MainLayout = ({ children }) => {
  const { pathname } = useLocation();
  const basePath = '/' + pathname.split('/')[1];
  const title = PAGE_TITLES[basePath] || 'Confluence Trade Crew';

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}></div>
          <span className={styles.logoText}>CTC</span>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.pageTitle}>{title}</h1>
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
