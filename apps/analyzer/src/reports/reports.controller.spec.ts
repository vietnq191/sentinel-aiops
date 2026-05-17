import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { SelfHealingService } from '#src/self-healing/self-healing.service.js';
import { GeminiService } from '#src/ai/gemini.service.js';

describe('ReportsController 🚀', () => {
  let controller: ReportsController;
  let reportsService: jest.Mocked<ReportsService>;
  let selfHealingService: jest.Mocked<SelfHealingService>;
  let geminiService: jest.Mocked<GeminiService>;

  beforeEach(async () => {
    const mockReportsService = {
      getReports: jest.fn().mockReturnValue([{ id: 'REP001', errorCode: 'ERR_SYS_OOM' }]),
      getMetricsSummary: jest.fn().mockReturnValue({ totalReports: 1, mitigated: 1 }),
      getConfig: jest.fn().mockReturnValue({ cooldownMinutes: 5, isAutoHealingEnabled: true, aiPromptTemplate: '' }),
      updateConfig: jest.fn().mockImplementation((val: any) => ({ cooldownMinutes: 5, isAutoHealingEnabled: true, aiPromptTemplate: '', ...val })),
    };

    const mockSelfHealingService = {
      mitigateError: jest.fn<any>().mockResolvedValue({ success: true, action: 'Restarted container sentinel-simulator' }),
    };

    const mockGeminiService = {
      testModelConnection: jest.fn<any>().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useValue: mockReportsService },
        { provide: SelfHealingService, useValue: mockSelfHealingService },
        { provide: GeminiService, useValue: mockGeminiService },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    reportsService = module.get(ReportsService) as unknown as jest.Mocked<ReportsService>;
    selfHealingService = module.get(SelfHealingService) as unknown as jest.Mocked<SelfHealingService>;
    geminiService = module.get(GeminiService) as unknown as jest.Mocked<GeminiService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return reports from service', () => {
    const result = controller.getReports();
    expect(result).toEqual([{ id: 'REP001', errorCode: 'ERR_SYS_OOM' }]);
    expect(reportsService.getReports).toHaveBeenCalled();
  });

  it('should return metrics from service', () => {
    const result = controller.getMetrics();
    expect(result).toEqual({ totalReports: 1, mitigated: 1 });
    expect(reportsService.getMetricsSummary).toHaveBeenCalled();
  });

  it('should return config from service', () => {
    const result = controller.getConfig();
    expect(result).toEqual({ cooldownMinutes: 5, isAutoHealingEnabled: true, aiPromptTemplate: '' });
    expect(reportsService.getConfig).toHaveBeenCalled();
  });

  it('should update config and return it', () => {
    const result = controller.updateConfig({ cooldownMinutes: 10 });
    expect(result).toEqual({ cooldownMinutes: 10, isAutoHealingEnabled: true, aiPromptTemplate: '' });
    expect(reportsService.updateConfig).toHaveBeenCalledWith({ cooldownMinutes: 10 });
  });

  it('should trigger manual self-healing and return status', async () => {
    const result = await controller.triggerManualSelfHealing('ERR_SYS_OOM');
    expect(result).toEqual({ success: true, action: 'Restarted container sentinel-simulator' });
    expect(selfHealingService.mitigateError).toHaveBeenCalledWith('ERR_SYS_OOM');
  });

  it('should return error if errorCode is missing in self-healing', async () => {
    const result = await controller.triggerManualSelfHealing('');
    expect(result).toEqual({ success: false, error: 'errorCode is required' });
    expect(selfHealingService.mitigateError).not.toHaveBeenCalled();
  });
});
