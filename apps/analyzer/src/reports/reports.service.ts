import { Injectable } from '@nestjs/common';
import { AiReport, SystemConfig } from './interfaces/reports.interface.js';
import { MAX_REPORTS_LIMIT, PERCENTAGE_FACTOR } from './constants/reports.constants.js';
import { INITIAL_SYSTEM_CONFIG } from './config/reports.config.js';
import { generateUniqueReportId } from './utils/reports.utils.js';

@Injectable()
export class ReportsService {
  private reports: AiReport[] = [];
  private skippedCounts: Record<string, number> = {};
  private config: SystemConfig = { ...INITIAL_SYSTEM_CONFIG };

  /* Retrieve all logged incident analysis reports */
  getReports(): AiReport[] {
    return this.reports;
  }

  /* Insert a new incident analysis report */
  addReport(report: Omit<AiReport, 'id' | 'timestamp'>): AiReport {
    const newReport: AiReport = {
      ...report,
      id: generateUniqueReportId(),
      timestamp: new Date().toISOString(),
    };
    this.reports.unshift(newReport);

    /* Enforce strict memory limit boundary */
    if (this.reports.length > MAX_REPORTS_LIMIT) {
      this.reports.pop();
    }
    return newReport;
  }

  /* Partially update properties of an existing report */
  updateReport(id: string, updates: Partial<AiReport>): AiReport | null {
    const report = this.reports.find(r => r.id === id);
    if (report) {
      Object.assign(report, updates);
      return report;
    }
    return null;
  }

  /* Update the self-healing remediation status of a report */
  updateReportStatus(id: string, status: AiReport['status'], action?: string) {
    const report = this.reports.find(r => r.id === id);
    if (report) {
      report.status = status;
      if (action) {
        report.remediationAction = action;
      }
    }
  }

  /* Retrieve all dynamic log throttle/skipped occurrence counts */
  getSkippedCounts(): Record<string, number> {
    return this.skippedCounts;
  }

  /* Record dynamic Loki occurrences blocked by cooldown throttling */
  incrementSkippedCount(errorCode: string, count: number) {
    this.skippedCounts[errorCode] = (this.skippedCounts[errorCode] || 0) + count;
  }

  /* Clear the cooling log throttle rate meter for a specific pattern */
  resetSkippedCount(errorCode: string) {
    this.skippedCounts[errorCode] = 0;
  }

  /* Fetch the active AI remediation engine configuration */
  getConfig(): SystemConfig {
    return this.config;
  }

  /* Persist new AI remediation parameters */
  updateConfig(newConfig: Partial<SystemConfig>): SystemConfig {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    return this.config;
  }

  /* Aggregate telemetry metrics for Grafana and Dashboard visuals */
  getMetricsSummary() {
    const totalReports = this.reports.length;
    const mitigated = this.reports.filter(r => r.status === 'mitigated').length;
    const failedMitigation = this.reports.filter(r => r.status === 'failed_mitigation').length;
    
    const errorCodeStats: Record<string, number> = {};
    this.reports.forEach(r => {
      errorCodeStats[r.errorCode] = (errorCodeStats[r.errorCode] || 0) + 1;
    });

    return {
      totalReports,
      mitigated,
      failedMitigation,
      activeIssues: totalReports - mitigated - failedMitigation,
      autoHealingRate: totalReports > 0 ? Math.round((mitigated / totalReports) * PERCENTAGE_FACTOR) : 0,
      errorCodeStats,
    };
  }
}
