/* Reports module interfaces */

import { GeminiModel } from '#src/ai/interfaces/gemini.interface.js';

export interface AiReport {
  id: string;
  timestamp: string;
  errorCode: string;
  totalEvents: number;
  severity: string;
  rootCause: string;
  remediation: string;
  rawResponse: string;
  status: 'active' | 'mitigated' | 'failed_mitigation' | 'investigating' | 'analyzed';
  remediationAction?: string;
  rawLogs?: string[];
}

export interface SystemConfig {
  aiPromptTemplate: string;
  cooldownMinutes: number;
  isAutoHealingEnabled: boolean;
  selectedModel?: GeminiModel;
  modelTestStatus?: 'success' | 'failed' | 'sandbox' | null;
  modelTestError?: string | null;
}
