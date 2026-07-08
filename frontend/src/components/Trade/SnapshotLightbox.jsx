import React, { useState } from 'react';
import styles from './SnapshotLightbox.module.css';
import { X } from 'lucide-react';

const SnapshotLightbox = ({ trade, onClose }) => {
  const [activeTab, setActiveTab] = useState('entry'); // 'entry' | 'exit'

  if (!trade) return null;

  const hasEntry = !!trade.entrySnapshotUrl;
  const hasExit = !!trade.exitSnapshotUrl;
  
  // If entry doesn't exist but exit does, default to exit
  if (activeTab === 'entry' && !hasEntry && hasExit) {
    setActiveTab('exit');
  }

  const currentUrl = activeTab === 'entry' ? trade.entrySnapshotUrl : trade.exitSnapshotUrl;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>{trade.symbol} Snapshot</h3>
            <div className={styles.tabs}>
              <button 
                className={`${styles.tab} ${activeTab === 'entry' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('entry')}
                disabled={!hasEntry}
              >
                Entry
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'exit' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('exit')}
                disabled={!hasExit}
              >
                Exit
              </button>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className={styles.imageContainer}>
          {currentUrl ? (
            <img src={`${baseUrl}${currentUrl}`} alt={`${activeTab} snapshot`} className={styles.image} />
          ) : (
            <div className={styles.noImage}>No {activeTab} snapshot available for this trade.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnapshotLightbox;
