import { useState, useEffect } from 'react';
import axios from 'axios';
import { AiReport, MetricsSummary } from '../interfaces/dashboard.interface';
import { translations } from '../translations';
import { ITEMS_PER_PAGE } from '../constants/dashboard.constants';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;
const SIMULATOR_URL = import.meta.env.VITE_SIMULATOR_URL as string;

export function useDashboard() {
  const [reports, setReports] = useState<AiReport[]>([]);
  const [metrics, setMetrics] = useState<MetricsSummary>({
    totalReports: 0,
    mitigated: 0,
    failedMitigation: 0,
    activeIssues: 0,
    autoHealingRate: 0,
    errorCodeStats: {}
  });

  /* Search, Filters & Pagination States */
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = ITEMS_PER_PAGE;

  /* Language States */
  const [lang, setLang] = useState<'vi' | 'en'>(() => {
    const saved = localStorage.getItem('sre_dashboard_lang');
    return (saved === 'en' || saved === 'vi') ? saved : 'vi';
  });

  useEffect(() => {
    localStorage.setItem('sre_dashboard_lang', lang);
  }, [lang]);

  const t = translations[lang];

  /* Helper to format timestamps using client browser local timezone and locale */
  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      
      return date.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch {
      return isoString;
    }
  };

  /* Filtered reports logic */
  const filteredReports = reports.filter(report => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'UNRESOLVED' && report.status === 'mitigated') return false;
      if (statusFilter === 'HEALING_ATTEMPTED' && report.status !== 'mitigated' && report.status !== 'failed_mitigation') return false;
      if (statusFilter !== 'UNRESOLVED' && statusFilter !== 'HEALING_ATTEMPTED' && report.status !== statusFilter) return false;
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchCode = report.errorCode.toLowerCase().includes(term);
      const matchCause = report.rootCause.toLowerCase().includes(term);
      const matchRem = report.remediation.toLowerCase().includes(term);
      const matchLogs = report.rawLogs ? report.rawLogs.join('\n').toLowerCase().includes(term) : false;
      return matchCode || matchCause || matchRem || matchLogs;
    }

    return true;
  });

  /* Calculate pagination range */
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + itemsPerPage);

  /* Dynamic configuration states mapped from database */
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [cooldown, setCooldown] = useState(5);
  const [autoHeal, setAutoHeal] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; displayName: string }>>([]);
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [modelTestStatus, setModelTestStatus] = useState<null | 'success' | 'failed' | 'sandbox'>(null);
  const [modelTestError, setModelTestError] = useState<string | null>(null);
  const [isModelVerified, setIsModelVerified] = useState(true);
  const [injectionStatus, setInjectionStatus] = useState<string | null>(null);
  const [healerLog, setHealerLog] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  /* Poll for data on interval */
  useEffect(() => {
    fetchData();
    fetchConfig();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [reportsRes, metricsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/reports`),
        axios.get(`${BACKEND_URL}/api/metrics`)
      ]);
      setReports(reportsRes.data);
      setMetrics(metricsRes.data);
      setIsBackendConnected(true);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setIsBackendConnected(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const modelsRes = await axios.get(`${BACKEND_URL}/api/config/available-models`);
      if (Array.isArray(modelsRes.data)) {
        setAvailableModels(modelsRes.data);
      }

      const res = await axios.get(`${BACKEND_URL}/api/config`);
      setCustomPrompt(res.data.aiPromptTemplate);
      setCooldown(res.data.cooldownMinutes);
      setAutoHeal(res.data.isAutoHealingEnabled);
      if (res.data.selectedModel) {
        let model = res.data.selectedModel;
        if (model === 'gemini-1.5-flash') {
          model = 'gemini-flash-latest';
        } else if (model === 'gemini-1.5-pro' || model === 'gemini-pro') {
          model = 'gemini-pro-latest';
        }
        setSelectedModel(model);
        setIsModelVerified(res.data.modelTestStatus === 'success' || res.data.modelTestStatus === 'sandbox');
      }
      if (res.data.modelTestStatus) {
        setModelTestStatus(res.data.modelTestStatus);
      }
      if (res.data.modelTestError) {
        setModelTestError(res.data.modelTestError);
      }
      setIsBackendConnected(true);
    } catch (err) {
      console.error('Failed to fetch config:', err);
      setIsBackendConnected(false);
    }
  };

  const handleTestModel = async () => {
    setIsTestingModel(true);
    setModelTestStatus(null);
    setModelTestError(null);
    showToast(t.toastTestingModel.replace('{model}', selectedModel), 'success');
    
    try {
      const res = await axios.post(`${BACKEND_URL}/api/config/test-model`, {
        model: selectedModel
      });
      
      if (res.data.success) {
        if (res.data.isSandbox) {
          setModelTestStatus('sandbox');
          const errMsg = res.data.error || 'API rate limit or offline';
          setModelTestError(errMsg);
          setIsModelVerified(true);
          showToast(t.toastModelSandbox, 'error');
        } else {
          setModelTestStatus('success');
          setIsModelVerified(true);
          showToast(t.toastModelSuccess.replace('{model}', selectedModel), 'success');
        }
      } else {
        setModelTestStatus('failed');
        setIsModelVerified(false);
        const errMsg = res.data.error || 'Connection failed';
        setModelTestError(errMsg);
        const shortError = errMsg.length > 120 ? errMsg.slice(0, 120) + '...' : errMsg;
        showToast(t.toastModelFailed.replace('{error}', shortError), 'error');
      }
    } catch (err: any) {
      setModelTestStatus('failed');
      setIsModelVerified(false);
      const errMsg = err.response?.data?.message || err.message || 'API error';
      setModelTestError(errMsg);
      const shortError = errMsg.length > 120 ? errMsg.slice(0, 120) + '...' : errMsg;
      showToast(t.toastTestApiFailed.replace('{error}', shortError), 'error');
    } finally {
      setIsTestingModel(false);
    }
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredPlaceholders = ['{errorCode}', '{sampleLogs}', '{totalCount}'];
    const missingPlaceholders = requiredPlaceholders.filter(p => !customPrompt.includes(p));
    
    if (missingPlaceholders.length > 0) {
      showToast(t.toastMissingPlaceholder.replace('{missing}', missingPlaceholders.join(', ')), 'error');
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmSaveConfig = async () => {
    setShowConfirmModal(false);
    setIsSavingConfig(true);
    try {
      await axios.post(`${BACKEND_URL}/api/config`, {
        aiPromptTemplate: customPrompt,
        cooldownMinutes: Number(cooldown),
        isAutoHealingEnabled: autoHeal,
        selectedModel: selectedModel,
        modelTestStatus: modelTestStatus,
        modelTestError: modelTestError
      });
      showToast(t.toastUpdateConfigSuccess, 'success');
    } catch (err: any) {
      showToast(t.toastUpdateConfigFailed.replace('{error}', err.message), 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const injectFault = async (endpoint: string, label: string) => {
    setInjectionStatus(`Injected: ${label}...`);
    showToast(t.toastInjectingFault.replace('{label}', label), 'success');
    try {
      await axios.get(`${SIMULATOR_URL}${endpoint}`);
      setInjectionStatus(`Success: Injected fault ${label}`);
      showToast(t.toastInjectSuccessMsg.replace('{label}', label), 'success');
      setTimeout(() => setInjectionStatus(null), 4000);
    } catch (err: any) {
      setInjectionStatus(`Sent fault simulation command ${label} (Check Loki/Telegram)`);
      showToast(t.toastInjectCommandSent.replace('{label}', label), 'success');
      setTimeout(() => setInjectionStatus(null), 4000);
    }
  };

  const triggerManualHealing = async (errorCode: string) => {
    setHealerLog(`Sending mitigation command for: ${errorCode}...`);
    showToast(t.toastRetriggering.replace('{errorCode}', errorCode), 'success');
    try {
      const res = await axios.post(`${BACKEND_URL}/api/self-healing/trigger`, { errorCode });
      if (res.data.success) {
        setHealerLog(`Success: ${res.data.action}`);
        showToast(t.toastRetriggerSuccess.replace('{action}', res.data.action), 'success');
        fetchData();
      } else {
        setHealerLog(`Failed: ${res.data.error || 'No mitigation action defined'}`);
        showToast(t.toastRetriggerFailed.replace('{error}', res.data.error || 'No mitigation action defined'), 'error');
      }
      setTimeout(() => setHealerLog(null), 5000);
    } catch (err: any) {
      setHealerLog(`Connection error: ${err.message}`);
      showToast(t.toastConnectionError.replace('{error}', err.message), 'error');
      setTimeout(() => setHealerLog(null), 5000);
    }
  };

  const handleResolveIncident = async (id: string) => {
    setHealerLog(`Marking incident as resolved: ${id}...`);
    showToast(t.toastMarkingResolved, 'success');
    try {
      const res = await axios.post(`${BACKEND_URL}/api/reports/${id}/resolve`);
      if (res.data.success) {
        setHealerLog(`Success: Incident resolved: ${id}`);
        showToast(t.toastResolveSuccessMsg, 'success');
        fetchData();
      } else {
        setHealerLog(`Failed to resolve incident`);
        showToast(t.toastResolveFailed, 'error');
      }
      setTimeout(() => setHealerLog(null), 5000);
    } catch (err: any) {
      setHealerLog(`Connection error: ${err.message}`);
      showToast(t.toastConnectionError.replace('{error}', err.message), 'error');
      setTimeout(() => setHealerLog(null), 5000);
    }
  };

  const getSeverityClass = (sev: string) => {
    const s = sev.toUpperCase();
    if (s.includes('CRITICAL')) return 'badge-critical';
    if (s.includes('WARN')) return 'badge-warning';
    if (s.includes('INFO')) return 'badge-info';
    return 'badge-error';
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'mitigated') return 'badge-mitigated';
    if (status === 'failed_mitigation') return 'badge-failed';
    if (status === 'analyzed') return 'badge-info';
    if (status === 'active') return 'badge-warning';
    return 'badge-investigating';
  };

  const getStatusText = (status: string) => {
    if (status === 'mitigated') return t.statusMitigated;
    if (status === 'failed_mitigation') return t.statusFailedMitigation;
    if (status === 'analyzed') return t.statusAnalyzed;
    if (status === 'active') return t.statusActive;
    return t.statusInvestigating;
  };

  return {
    reports,
    metrics,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    lang,
    setLang,
    t,
    formatTimestamp,
    filteredReports,
    totalPages,
    paginatedReports,
    activeAccordion,
    setActiveAccordion,
    isSavingConfig,
    customPrompt,
    setCustomPrompt,
    cooldown,
    setCooldown,
    autoHeal,
    setAutoHeal,
    selectedModel,
    setSelectedModel,
    availableModels,
    isTestingModel,
    modelTestStatus,
    setModelTestStatus,
    modelTestError,
    setModelTestError,
    isModelVerified,
    setIsModelVerified,
    injectionStatus,
    healerLog,
    isBackendConnected,
    showConfirmModal,
    setShowConfirmModal,
    toastMessage,
    handleTestModel,
    saveConfig,
    confirmSaveConfig,
    injectFault,
    triggerManualHealing,
    handleResolveIncident,
    getSeverityClass,
    getStatusBadgeClass,
    getStatusText
  };
}
