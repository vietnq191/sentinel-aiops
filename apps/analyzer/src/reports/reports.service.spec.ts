import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service.js';
import { Logger } from '@nestjs/common';

describe('ReportsService 📊', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService],
    }).compile();

    /* Silence NestJS Logger during unit tests for clean mock outputs */
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addReport & getReports', () => {
    it('should add a new report and prepend it to the list', () => {
      const mockReportData = {
        errorCode: 'ERR_SYS_OOM',
        totalEvents: 3,
        severity: 'CRITICAL',
        rootCause: 'Heap out of memory in Node process',
        remediation: 'Restart simulator container',
        rawResponse: 'Sample raw GPT content',
        status: 'investigating' as const,
      };

      const added = service.addReport(mockReportData);

      expect(added.id).toBeDefined();
      expect(added.id.length).toBe(7);
      expect(added.timestamp).toBeDefined();
      expect(added.errorCode).toBe('ERR_SYS_OOM');
      
      const allReports = service.getReports();
      expect(allReports.length).toBe(1);
      expect(allReports[0]).toEqual(added);
    });

    it('should cap the in-memory store at 100 reports', () => {
      const mockReportData = {
        errorCode: 'ERR_GENERIC',
        totalEvents: 1,
        severity: 'WARN',
        rootCause: 'Generic error message',
        remediation: 'Investigate logs',
        rawResponse: '',
        status: 'investigating' as const,
      };

      /* Add 105 reports */
      for (let i = 0; i < 105; i++) {
        service.addReport({
          ...mockReportData,
          errorCode: `ERR_${i}`,
        });
      }

      const allReports = service.getReports();
      expect(allReports.length).toBe(100);
      /* Verify that newest items are prepended, meaning ERR_104 is first, ERR_0 is discarded */
      expect(allReports[0].errorCode).toBe('ERR_104');
    });
  });

  describe('updateReportStatus', () => {
    it('should update the status of an existing report', () => {
      const mockReport = service.addReport({
        errorCode: 'ERR_DB_001',
        totalEvents: 1,
        severity: 'CRITICAL',
        rootCause: 'DB Timeout',
        remediation: 'Restart database',
        rawResponse: '',
        status: 'investigating',
      });

      service.updateReportStatus(mockReport.id, 'mitigated', 'Restarted simulator container successfully');

      const updatedReport = service.getReports().find(r => r.id === mockReport.id);
      expect(updatedReport?.status).toBe('mitigated');
      expect(updatedReport?.remediationAction).toBe('Restarted simulator container successfully');
    });
  });

  describe('Skipped Counts Tracker', () => {
    it('should increment and reset skipped log counts', () => {
      service.incrementSkippedCount('ERR_SYS_OOM', 5);
      service.incrementSkippedCount('ERR_SYS_OOM', 2);
      
      expect(service.getSkippedCounts()['ERR_SYS_OOM']).toBe(7);

      service.resetSkippedCount('ERR_SYS_OOM');
      expect(service.getSkippedCounts()['ERR_SYS_OOM']).toBe(0);
    });
  });

  describe('SystemConfig', () => {
    it('should return initial configurations', () => {
      const config = service.getConfig();
      expect(config.isAutoHealingEnabled).toBe(true);
      expect(config.cooldownMinutes).toBe(5);
      expect(config.aiPromptTemplate).toContain('You are an expert SRE');
    });

    it('should update partial configurations', () => {
      service.updateConfig({ cooldownMinutes: 10, isAutoHealingEnabled: false });
      const config = service.getConfig();
      expect(config.cooldownMinutes).toBe(10);
      expect(config.isAutoHealingEnabled).toBe(false);
      /* Prompt should remain unchanged */
      expect(config.aiPromptTemplate).toContain('You are an expert SRE');
    });
  });

  describe('getMetricsSummary', () => {
    it('should compute metrics correctly', () => {
      /* Add 2 mitigated errors */
      const r1 = service.addReport({
        errorCode: 'ERR_SYS_OOM',
        totalEvents: 1,
        severity: 'CRITICAL',
        rootCause: 'OOM',
        remediation: 'Restart',
        rawResponse: '',
        status: 'mitigated',
      });
      const r2 = service.addReport({
        errorCode: 'ERR_SYS_OOM',
        totalEvents: 2,
        severity: 'CRITICAL',
        rootCause: 'OOM',
        remediation: 'Restart',
        rawResponse: '',
        status: 'mitigated',
      });

      /* Add 1 failed mitigation error */
      const r3 = service.addReport({
        errorCode: 'ERR_DB_001',
        totalEvents: 5,
        severity: 'CRITICAL',
        rootCause: 'DB error',
        remediation: 'Check network',
        rawResponse: '',
        status: 'failed_mitigation',
      });

      const metrics = service.getMetricsSummary();

      expect(metrics.totalReports).toBe(3);
      expect(metrics.mitigated).toBe(2);
      expect(metrics.failedMitigation).toBe(1);
      expect(metrics.autoHealingRate).toBe(67); // 2/3 = 66.66% -> rounded to 67
      expect(metrics.errorCodeStats['ERR_SYS_OOM']).toBe(2);
      expect(metrics.errorCodeStats['ERR_DB_001']).toBe(1);
    });
  });
});
