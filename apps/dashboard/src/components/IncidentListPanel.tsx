import React from 'react';
import { Terminal, HelpCircle } from 'lucide-react';
import { AiReport } from '../interfaces/dashboard.interface';
import { IncidentCard } from './IncidentCard';

interface IncidentListPanelProps {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  currentPage: number;
  setCurrentPage: (p: number | ((prev: number) => number)) => void;
  filteredReports: AiReport[];
  paginatedReports: AiReport[];
  totalPages: number;
  activeAccordion: string | null;
  setActiveAccordion: (id: string | null) => void;
  formatTimestamp: (iso: string) => string;
  getSeverityClass: (sev: string) => string;
  getStatusBadgeClass: (status: string) => string;
  getStatusText: (status: string) => string;
  triggerManualHealing: (code: string) => Promise<void>;
  handleResolveIncident: (id: string) => Promise<void>;
  t: any;
}

export const IncidentListPanel: React.FC<IncidentListPanelProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  currentPage,
  setCurrentPage,
  filteredReports,
  paginatedReports,
  totalPages,
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
  return (
    <section>
      {/* Panel Header */}
      <div className="section-title">
        <Terminal size={20} color="var(--color-primary)" />
        <h2>{t.rcaLogsTitle}</h2>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        marginBottom: '1.25rem'
      }}>
        {/* Search Field */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '220px' }}>
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
        </div>

        {/* Filters and Dropdown */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {(statusFilter !== 'ALL' || searchTerm) && (
            <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', background: 'rgba(54, 188, 247, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '20px', border: '1px solid rgba(54, 188, 247, 0.2)' }}>
              {t.filteringBadge} {statusFilter === 'UNRESOLVED' ? t.activeBadgeText : statusFilter === 'HEALING_ATTEMPTED' ? t.mitigatedBadgeText : statusFilter !== 'ALL' ? getStatusText(statusFilter) : ''} {searchTerm ? `"${searchTerm}"` : ''}
            </span>
          )}

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">{t.allStatus}</option>
            <option value="investigating">{t.statusInvestigating}</option>
            <option value="analyzed">{t.statusAnalyzed}</option>
            <option value="mitigated">{t.statusMitigated}</option>
            <option value="failed_mitigation">{t.statusFailedMitigation}</option>
            <option value="active">{t.statusActive}</option>
            <option value="UNRESOLVED">{t.statusUnresolved}</option>
          </select>

          {(searchTerm || statusFilter !== 'ALL') && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setCurrentPage(1); }}
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
            >
              {t.resetFilters}
            </button>
          )}
        </div>
      </div>

      {/* Incidents Container */}
      <div className="incidents-container">
        {filteredReports.length === 0 ? (
          <div className="empty-state">
            <HelpCircle size={48} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
            <h3>{t.emptyStateTitle}</h3>
            <p>{t.emptyStateSubtitle}</p>
          </div>
        ) : (
          paginatedReports.map((report) => (
            <IncidentCard 
              key={report.id}
              report={report}
              activeAccordion={activeAccordion}
              setActiveAccordion={setActiveAccordion}
              formatTimestamp={formatTimestamp}
              getSeverityClass={getSeverityClass}
              getStatusBadgeClass={getStatusBadgeClass}
              getStatusText={getStatusText}
              triggerManualHealing={triggerManualHealing}
              handleResolveIncident={handleResolveIncident}
              t={t}
            />
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          marginTop: '1.25rem',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          padding: '0.6rem 1rem',
          borderRadius: '12px'
        }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{ opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
          >
            {t.prevPage}
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {t.pageText} <strong>{currentPage}</strong> / {totalPages} ({t.totalText} {filteredReports.length} {t.issuesText})
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            {t.nextPage}
          </button>
        </div>
      )}
    </section>
  );
};
