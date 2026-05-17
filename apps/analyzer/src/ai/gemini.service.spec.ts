import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { GeminiService } from './gemini.service.js';
import { ReportsService } from '#src/reports/reports.service.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Logger } from '@nestjs/common';

describe('GeminiService 🤖', () => {
  let service: GeminiService;
  let reportsService: jest.Mocked<ReportsService>;
  let spyGetGenerativeModel: any;
  let mockModel: any;
  const originalEnv = process.env;

  beforeEach(async () => {
    // Silence NestJS Logger during unit tests for clean mock outputs
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    process.env = {
      ...originalEnv,
      GEMINI_API_KEY: 'mock_gemini_key',
      GEMINI_MODEL: 'gemini-1.5-flash',
    };

    mockModel = {
      generateContent: jest.fn<any>(),
    };

    // Spy directly on prototype methods for rock-solid ESM class mocking
    spyGetGenerativeModel = jest.spyOn(GoogleGenerativeAI.prototype, 'getGenerativeModel').mockReturnValue(mockModel as any);

    const mockReportsService = {
      getConfig: jest.fn().mockReturnValue({
        cooldownMinutes: 5,
        aiPromptTemplate: 'Analyze error {errorCode} with logs:\n{sampleLogs}',
      }),
      incrementSkippedCount: jest.fn(),
      resetSkippedCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        { provide: ReportsService, useValue: mockReportsService },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
    reportsService = module.get(ReportsService) as unknown as jest.Mocked<ReportsService>;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeErrorPattern', () => {
    it('should query Gemini API, reset skipped counter, and return response text', async () => {
      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () => 'SEVERITY: CRITICAL\nROOT CAUSE: OOM\nREMEDIATION: Restart',
        },
      });

      const result = await service.analyzeErrorPattern('ERR_SYS_OOM', ['log line 1', 'log line 2']);

      expect(result).toBe('SEVERITY: CRITICAL\nROOT CAUSE: OOM\nREMEDIATION: Restart');
      expect(spyGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-1.5-flash' });
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('ERR_SYS_OOM')
      );
      expect(reportsService.resetSkippedCount).toHaveBeenCalledWith('ERR_SYS_OOM');
    });

    it('should enforce cooldown minutes and return null on subsequent fast calls', async () => {
      // First call (hits API)
      mockModel.generateContent.mockResolvedValueOnce({
        response: { text: () => 'First output' },
      });
      await service.analyzeErrorPattern('ERR_SYS_OOM', ['log']);

      // Second call (hits cooldown)
      const result = await service.analyzeErrorPattern('ERR_SYS_OOM', ['log line 2']);

      expect(result).toBeNull();
      expect(reportsService.incrementSkippedCount).toHaveBeenCalledWith('ERR_SYS_OOM', 1);
    });

    it('should throw an error during instantiation if GEMINI_API_KEY is missing', async () => {
      process.env.GEMINI_API_KEY = '';

      await expect(Test.createTestingModule({
        providers: [
          GeminiService,
          { provide: ReportsService, useValue: reportsService },
        ],
      }).compile()).rejects.toThrow('FATAL: GEMINI_API_KEY environment variable is not defined or is empty!');
    });
  });
});
