import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { SelfHealingService } from './self-healing.service.js';
import { Logger } from '@nestjs/common';
import Docker from 'dockerode';

describe('SelfHealingService 🛠️', () => {
  let service: SelfHealingService;
  let spyListContainers: any;
  let spyGetContainer: any;
  let mockContainer: any;

  beforeEach(async () => {
    // Silence NestJS Logger during unit tests for clean mock outputs
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    mockContainer = {
      restart: jest.fn<any>().mockResolvedValue({}),
    };

    // Spy directly on prototype methods for rock-solid ESM class mocking
    spyListContainers = jest.spyOn(Docker.prototype, 'listContainers');
    spyGetContainer = jest.spyOn(Docker.prototype, 'getContainer').mockReturnValue(mockContainer as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [SelfHealingService],
    }).compile();

    service = module.get<SelfHealingService>(SelfHealingService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mitigateError', () => {
    it('should restart sentinel-simulator on OOM error', async () => {
      spyListContainers.mockResolvedValueOnce([
        {
          Id: '1234567890abcdef',
          Names: ['/sentinel-simulator'],
        },
      ]);

      const result = await service.mitigateError('ERR_SYS_OOM');

      expect(result.success).toBe(true);
      expect(result.action).toContain('Successfully restarted container "sentinel-simulator"');
      expect(spyListContainers).toHaveBeenCalled();
      expect(spyGetContainer).toHaveBeenCalledWith('1234567890abcdef');
      expect(mockContainer.restart).toHaveBeenCalled();
    });

    it('should restart sentinel-simulator on DB Timeout error', async () => {
      spyListContainers.mockResolvedValueOnce([
        {
          Id: 'db-con-id',
          Names: ['/sentinel-simulator-worker', '/sentinel-simulator'],
        },
      ]);

      const result = await service.mitigateError('ERR_DB_001');

      expect(result.success).toBe(true);
      expect(result.action).toContain('Successfully restarted container "sentinel-simulator"');
    });

    it('should return failure if container is not found on host', async () => {
      spyListContainers.mockResolvedValueOnce([]); // No container found

      const result = await service.mitigateError('ERR_SYS_OOM');

      expect(result.success).toBe(false);
      expect(result.action).toBe('Restart Simulator Container');
      expect(result.error).toContain('Container "sentinel-simulator" not found');
    });

    it('should return failure if docker.restart fails', async () => {
      spyListContainers.mockResolvedValueOnce([
        {
          Id: 'oom-err-id',
          Names: ['/sentinel-simulator'],
        },
      ]);
      mockContainer.restart.mockRejectedValueOnce(new Error('Docker daemon not responding'));

      const result = await service.mitigateError('ERR_SYS_OOM');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Docker daemon not responding');
    });

    it('should skip self-healing if error code is not defined in mitigation policy', async () => {
      const result = await service.mitigateError('ERR_JWT_EXPIRED');

      expect(result.success).toBe(false);
      expect(result.action).toBe('No Action Defined');
    });
  });
});
