/* Dashboard module interfaces */

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

export interface MetricsSummary {
  totalReports: number;
  mitigated: number;
  failedMitigation: number;
  activeIssues: number;
  autoHealingRate: number;
  errorCodeStats: Record<string, number>;
}
