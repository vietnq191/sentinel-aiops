/// <reference types="vite/client" />

/* Custom observe-and-heal logic hook */
import { useDashboard } from './hooks/useDashboard';

/* Presentation sub-components */
import { Header } from './components/Header';
import { MetricsCards } from './components/MetricsCards';
import { IncidentListPanel } from './components/IncidentListPanel';
import { SimulatorPanel } from './components/SimulatorPanel';
import { ConfigPanel } from './components/ConfigPanel';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastNotification } from './components/ToastNotification';

export default function App() {
  const dashboard = useDashboard();
  const t = dashboard.t;

  return (
    <div className="container">
      {/* 1. Header & Live Online Indicator */}
      <Header 
        lang={dashboard.lang}
        setLang={dashboard.setLang}
        isBackendConnected={dashboard.isBackendConnected}
        autoHeal={dashboard.autoHeal}
        t={t}
      />

      {/* 2. Operations Metrics Telemetry */}
      <MetricsCards 
        metrics={dashboard.metrics}
        statusFilter={dashboard.statusFilter}
        setStatusFilter={dashboard.setStatusFilter}
        setSearchTerm={dashboard.setSearchTerm}
        setCurrentPage={dashboard.setCurrentPage}
        t={t}
      />

      {/* 3. Main Dashboard Layout Panel Grid */}
      <div className="main-layout">
        {/* Left Column: Live Loki logs & AI RCA entries */}
        <IncidentListPanel 
          searchTerm={dashboard.searchTerm}
          setSearchTerm={dashboard.setSearchTerm}
          statusFilter={dashboard.statusFilter}
          setStatusFilter={dashboard.setStatusFilter}
          currentPage={dashboard.currentPage}
          setCurrentPage={dashboard.setCurrentPage}
          filteredReports={dashboard.filteredReports}
          paginatedReports={dashboard.paginatedReports}
          totalPages={dashboard.totalPages}
          activeAccordion={dashboard.activeAccordion}
          setActiveAccordion={dashboard.setActiveAccordion}
          formatTimestamp={dashboard.formatTimestamp}
          getSeverityClass={dashboard.getSeverityClass}
          getStatusBadgeClass={dashboard.getStatusBadgeClass}
          getStatusText={dashboard.getStatusText}
          triggerManualHealing={dashboard.triggerManualHealing}
          handleResolveIncident={dashboard.handleResolveIncident}
          t={t}
        />

        {/* Right Column: SRE control sidebar panel */}
        <aside>
          {/* Fault injection simulation controls */}
          <SimulatorPanel 
            injectFault={dashboard.injectFault}
            injectionStatus={dashboard.injectionStatus}
            healerLog={dashboard.healerLog}
            t={t}
          />

          {/* AI Self-healing prompt config form */}
          <ConfigPanel 
            saveConfig={dashboard.saveConfig}
            autoHeal={dashboard.autoHeal}
            setAutoHeal={dashboard.setAutoHeal}
            cooldown={dashboard.cooldown}
            setCooldown={dashboard.setCooldown}
            selectedModel={dashboard.selectedModel}
            setSelectedModel={dashboard.setSelectedModel}
            setIsModelVerified={dashboard.setIsModelVerified}
            setModelTestStatus={dashboard.setModelTestStatus}
            setModelTestError={dashboard.setModelTestError}
            handleTestModel={dashboard.handleTestModel}
            isTestingModel={dashboard.isTestingModel}
            modelTestStatus={dashboard.modelTestStatus}
            modelTestError={dashboard.modelTestError}
            isModelVerified={dashboard.isModelVerified}
            customPrompt={dashboard.customPrompt}
            setCustomPrompt={dashboard.setCustomPrompt}
            isSavingConfig={dashboard.isSavingConfig}
            availableModels={dashboard.availableModels}
            t={t}
          />
        </aside>
      </div>

      {/* 4. Action Confirmation Modal Overlay */}
      <ConfirmModal 
        isOpen={dashboard.showConfirmModal}
        onClose={() => dashboard.setShowConfirmModal(false)}
        onConfirm={dashboard.confirmSaveConfig}
        t={t}
      />

      {/* 5. Telemetry Toast Alerts Overlay */}
      <ToastNotification 
        toastMessage={dashboard.toastMessage}
      />
    </div>
  );
}
