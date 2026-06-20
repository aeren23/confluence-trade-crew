import React, { useEffect, useRef, useState } from 'react';
import styles from './TelemetryConsole.module.css';
import useAppStore from '../../store/useAppStore';
import {
  Terminal, Activity, BrainCircuit, Globe, ShieldAlert,
  Wrench, Lightbulb, CheckCircle2, Rocket, ChevronDown, ChevronUp
} from 'lucide-react';

// ── Agent metadata ─────────────────────────────────────────────────────────
const AGENTS = {
  'System':                    { icon: <Rocket size={13} />,      color: '#f59e0b' },
  'Data Agent':                { icon: <Activity size={13} />,    color: '#60a5fa' },
  'Technical Analysis Agent':  { icon: <BrainCircuit size={13} />,color: '#a78bfa' },
  'News Agent':                { icon: <Globe size={13} />,       color: '#34d399' },
  'Risk Agent':                { icon: <ShieldAlert size={13} />, color: '#f87171' },
  'Orchestrator':              { icon: <Terminal size={13} />,    color: '#00f0ff' },
};

// ── Step type metadata ─────────────────────────────────────────────────────
const STEP_META = {
  thought:  { icon: <Lightbulb size={11} />,    label: 'Thought',    badge: styles.badgeThought   },
  tool:     { icon: <Wrench size={11} />,       label: 'Tool',       badge: styles.badgeTool      },
  finished: { icon: <CheckCircle2 size={11} />, label: 'Done',       badge: styles.badgeFinished  },
  pipeline: { icon: <Rocket size={11} />,       label: 'Pipeline',   badge: styles.badgePipeline  },
  system:   { icon: <Terminal size={11} />,     label: 'System',     badge: styles.badgeSystem    },
};

// ── Collapsible log row ────────────────────────────────────────────────────
const LogRow = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  const agent   = AGENTS[log.agent]   || { icon: <Terminal size={13} />, color: '#a1a1aa' };
  const stepKey = log.type || 'thought';
  const step    = STEP_META[stepKey]  || STEP_META.thought;

  const isLong  = log.message && log.message.length > 160;
  const display = (!isLong || expanded) ? log.message : log.message.slice(0, 160) + '…';

  const time = new Date(log.timestamp).toLocaleTimeString([], {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <div className={`${styles.logEntry} ${styles[stepKey] || ''}`}>
      {/* Timestamp */}
      <span className={styles.ts}>{time}</span>

      {/* Agent badge */}
      <span className={styles.agentTag} style={{ '--agent-color': agent.color }}>
        {agent.icon}
        <span>{log.agent}</span>
      </span>

      {/* Step type badge */}
      <span className={`${styles.typeBadge} ${step.badge}`}>
        {step.icon}
        {step.label}
      </span>

      {/* Message + expand toggle */}
      <span className={styles.msg}>
        {display}
        {isLong && (
          <button
            className={styles.expandBtn}
            onClick={() => setExpanded(e => !e)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </span>
    </div>
  );
};

// ── Main TelemetryConsole ──────────────────────────────────────────────────
const TelemetryConsole = () => {
  const { telemetryLogs, analysisStatus } = useAppStore();
  const bottomRef = useRef(null);
  const [now, setNow] = useState(() => Date.now());

  // Tick every second while analysis is loading to update elapsed time.
  useEffect(() => {
    if (analysisStatus !== 'loading') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [analysisStatus]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [telemetryLogs]);

  const thoughtCount = telemetryLogs.filter(l => l.type === 'thought').length;
  const toolCount    = telemetryLogs.filter(l => l.type === 'tool').length;

  // Derive last-event info for the "thinking" indicator.
  const lastLog = telemetryLogs.length > 0 ? telemetryLogs[telemetryLogs.length - 1] : null;
  const secondsSinceLast = lastLog
    ? Math.floor((now - new Date(lastLog.timestamp).getTime()) / 1000)
    : 0;
  const lastAgent = lastLog?.agent || 'Agent';
  const showThinking = analysisStatus === 'loading' && secondsSinceLast > 10;

  if (telemetryLogs.length === 0 && analysisStatus === 'idle') {
    return (
      <div className={`glass-card ${styles.emptyConsole}`}>
        <Terminal size={32} className={styles.emptyIcon} />
        <p>Awaiting initialization sequence...</p>
        <p className={styles.emptyHint}>Click &ldquo;Initialize CrewAI Pipeline&rdquo; to start</p>
      </div>
    );
  }

  return (
    <div className={`glass-card ${styles.console}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Terminal size={14} />
          <span>Live Telemetry Stream</span>
          {analysisStatus === 'loading' && (
            <span className={styles.blinkingCursor} />
          )}
        </div>
        {telemetryLogs.length > 0 && (
          <div className={styles.stats}>
            <span className={styles.stat}>
              <Lightbulb size={11} /> {thoughtCount}
            </span>
            <span className={styles.stat}>
              <Wrench size={11} /> {toolCount}
            </span>
            <span className={styles.stat}>
              {telemetryLogs.length} events
            </span>
          </div>
        )}
      </div>

      {/* Log list */}
      <div className={styles.logContainer}>
        {telemetryLogs.map((log, index) => (
          <LogRow key={index} log={log} />
        ))}

        {/* Thinking indicator — shown when no events for >10s during loading */}
        {showThinking && (
          <div className={styles.thinkingRow}>
            <span className={styles.thinkingPulse} />
            <span className={styles.thinkingText}>
              {lastAgent} is working... ({secondsSinceLast}s)
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TelemetryConsole;
