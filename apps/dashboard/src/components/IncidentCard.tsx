import React from 'react';
import { Sparkles, Wrench, Terminal, Server, CheckCircle2 } from 'lucide-react';
import { AiReport } from '../interfaces/dashboard.interface';

interface IncidentCardProps {
  report: AiReport;
  activeAccordion: string | null;
  setActiveAccordion: (id: string | null) => void;
  formatTimestamp: (iso: string) => string;
  getSeverityClass: (sev: string) => string;
  getStatusBadgeClass: (status: string) => string;
  getStatusText: (status: string) => string;
  triggerManualHealing: (errorCode: string) => Promise<void>;
  handleResolveIncident: (id: string) => Promise<void>;
  t: any;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({
  report,
  activeAccordion,
  setActiveAccordion,
  formatTimestamp,
  getSeverityClass,
  getStatusBadgeClass,
  getStatusText,
  triggerManualHealing,
  handleResolveIncident,
  t
}) => {
  const isExpanded = activeAccordion === report.id;

  return (
    <div className="incident-card">
      <div 
        className="incident-header" 
        style={{ cursor: 'pointer' }}
        onClick={() => setActiveAccordion(isExpanded ? null : report.id)}
      >
        <div className="incident-title">
          <code>{report.errorCode}</code>
          <span className={`badge ${getSeverityClass(report.severity)}`}>
            {report.severity}
          </span>
          <span className={`badge ${getStatusBadgeClass(report.status)}`}>
            {getStatusText(report.status)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="incident-time" title="Múi giờ của thiết bị truy cập client">
            🕒 {formatTimestamp(report.timestamp)}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
            {isExpanded ? t.collapse : t.details}
          </span>
        </div>
      </div>

      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
        {t.incidentLatestEvent.replace('{count}', String(report.totalEvents))}
      </div>

      {/* Expandable Accordion Body */}
      {isExpanded && (
        <div className="incident-body">
          <div className="content-block">
            <div className="content-block-title">
              <Sparkles size={16} color="var(--color-primary)" />
              <span>{t.aiRootCause}</span>
            </div>
            <p>{report.rootCause}</p>
          </div>

          <div className="content-block content-block-remediation">
            <div className="content-block-title">
              <Wrench size={16} color="var(--color-success)" />
              <span>{t.aiRemediation}</span>
            </div>
            <p>{report.remediation}</p>
          </div>

          {/* Remediation Action Status */}
          {report.remediationAction && (
            <div className={`healing-alert ${report.status === 'failed_mitigation' ? 'healing-alert-failed' : ''}`}>
              <Server size={18} />
              <div>
                <strong>{t.selfHealingStatus}</strong> {report.remediationAction}
              </div>
            </div>
          )}

          {/* Raw Loki logs code block */}
          {report.rawLogs && report.rawLogs.length > 0 && (
            <div className="content-block" style={{ marginTop: '1rem' }}>
              <div className="content-block-title">
                <Terminal size={16} color="var(--color-primary)" />
                <span>{t.rawLokiLogs}</span>
              </div>
              <pre style={{
                background: 'rgba(10, 10, 20, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '0.75rem',
                borderRadius: '8px',
                maxHeight: '130px',
                overflowY: 'auto',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                color: '#cbd5e1',
                whiteSpace: 'pre-wrap',
                textAlign: 'left'
              }}>
                {report.rawLogs.join('\n')}
              </pre>
            </div>
          )}

          {/* Manual Action trigger */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button 
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => triggerManualHealing(report.errorCode)}
            >
              <Wrench size={14} /> {t.retriggerMitigation}
            </button>
            {report.status !== 'mitigated' && (
              <button 
                className="btn btn-secondary btn-sm"
                style={{ 
                  padding: '0.4rem 0.8rem', 
                  fontSize: '0.8rem', 
                  backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                  color: 'var(--color-success)', 
                  borderColor: 'rgba(16, 185, 129, 0.3)' 
                }}
                onClick={() => handleResolveIncident(report.id)}
              >
                <CheckCircle2 size={14} /> {t.markResolved}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
