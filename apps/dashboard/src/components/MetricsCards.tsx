import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react';
import { MetricsSummary } from '../interfaces/dashboard.interface';

interface MetricsCardsProps {
  metrics: MetricsSummary;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  setSearchTerm: (term: string) => void;
  setCurrentPage: (page: number) => void;
  t: any;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  metrics,
  statusFilter,
  setStatusFilter,
  setSearchTerm,
  setCurrentPage,
  t
}) => {
  const handleCardClick = (filter: string) => {
    setStatusFilter(filter);
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <section className="metrics-grid">
      <div 
        className={`metric-card metric-primary ${statusFilter === 'ALL' ? 'active-metric-card' : ''}`}
        onClick={() => handleCardClick('ALL')}
        style={{ cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
        title={t.titleAllIncidents}
      >
        <div className="metric-info">
          <p>{t.totalIncidents}</p>
          <h3>{metrics.totalReports}</h3>
        </div>
        <div className="metric-icon">
          <Activity size={24} />
        </div>
      </div>

      <div 
        className={`metric-card metric-success ${statusFilter === 'mitigated' ? 'active-metric-card' : ''}`}
        onClick={() => handleCardClick('mitigated')}
        style={{ cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
        title={t.titleResolvedIncidents}
      >
        <div className="metric-info">
          <p>{t.autoMitigated}</p>
          <h3>{metrics.mitigated}</h3>
        </div>
        <div className="metric-icon">
          <CheckCircle2 size={24} />
        </div>
      </div>

      <div 
        className={`metric-card metric-danger ${statusFilter === 'UNRESOLVED' ? 'active-metric-card' : ''}`}
        onClick={() => handleCardClick('UNRESOLVED')}
        style={{ cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
        title={t.titleUnresolvedIncidents}
      >
        <div className="metric-info">
          <p>{t.unresolved}</p>
          <h3>{metrics.activeIssues}</h3>
        </div>
        <div className="metric-icon">
          <AlertTriangle size={24} />
        </div>
      </div>

      <div 
        className={`metric-card metric-info ${statusFilter === 'HEALING_ATTEMPTED' ? 'active-metric-card' : ''}`}
        onClick={() => handleCardClick('HEALING_ATTEMPTED')}
        style={{ cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
        title={t.titleHealingIncidents}
      >
        <div className="metric-info">
          <p>{t.autoHealingRate}</p>
          <h3>{metrics.autoHealingRate}%</h3>
        </div>
        <div className="metric-icon">
          <Wrench size={24} />
        </div>
      </div>
    </section>
  );
};
