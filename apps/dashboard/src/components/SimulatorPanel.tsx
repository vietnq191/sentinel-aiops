import React from 'react';
import { Server, Play } from 'lucide-react';

interface SimulatorPanelProps {
  injectFault: (endpoint: string, label: string) => Promise<void>;
  injectionStatus: string | null;
  healerLog: string | null;
  t: any;
}

export const SimulatorPanel: React.FC<SimulatorPanelProps> = ({
  injectFault,
  injectionStatus,
  healerLog,
  t
}) => {
  return (
    <>
      <div className="section-title">
        <Server size={20} color="var(--color-danger)" />
        <h2>{t.faultSimulatorTitle}</h2>
      </div>

      <div className="sidebar-panel" style={{ borderLeft: '3px solid var(--color-danger)' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {t.faultSimulatorDesc}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
          <button className="btn btn-danger" onClick={() => injectFault('/oom-error', 'OOM (Heap Memory Out)')}>
            <Play size={14} /> {t.faultOOM}
          </button>

          <button className="btn btn-danger" style={{ background: '#F59E0B' }} onClick={() => injectFault('/error', 'Database Timeout')}>
            <Play size={14} /> {t.faultTimeout}
          </button>

          <button className="btn btn-secondary" onClick={() => injectFault('/auth-error', 'Expired JWT Token')}>
            <Play size={14} /> {t.faultAuth}
          </button>

          <button className="btn btn-secondary" onClick={() => injectFault('/rate-limit', 'Net Limit 429')}>
            <Play size={14} /> {t.faultRateLimit}
          </button>

          <button className="btn btn-secondary" onClick={() => injectFault('/slow', 'Slow Latency Warning')}>
            <Play size={14} /> {t.faultLatency}
          </button>
        </div>

        {injectionStatus && (
          <div style={{ 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid var(--border-color)',
            padding: '0.5rem 0.75rem', 
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-primary)'
          }}>
            {injectionStatus}
          </div>
        )}

        {healerLog && (
          <div style={{ 
            background: 'rgba(0,0,0,0.4)', 
            border: '1px solid var(--border-color)',
            padding: '0.5rem 0.75rem', 
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-success)'
          }}>
            {healerLog}
          </div>
        )}
      </div>
    </>
  );
};
