import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { PostScanTasksService } from './post-scan-tasks.service';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { EnrichmentQueueService } from '@features/external-metadata/infrastructure/services/enrichment-queue.service';
import { LufsAnalysisQueueService } from './lufs-analysis-queue.service';
import { DjAnalysisQueueService } from '@features/dj/infrastructure/services/dj-analysis-queue.service';

describe('PostScanTasksService', () => {
  let service: PostScanTasksService;
  let settingsService: { getBoolean: jest.Mock };
  let enrichmentQueue: { startEnrichmentQueue: jest.Mock };
  let lufsQueue: { startLufsAnalysisQueue: jest.Mock };
  let djQueue: { startAnalysisQueue: jest.Mock };

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    settingsService = { getBoolean: jest.fn() };
    enrichmentQueue = { startEnrichmentQueue: jest.fn() };
    lufsQueue = { startLufsAnalysisQueue: jest.fn() };
    djQueue = { startAnalysisQueue: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        PostScanTasksService,
        { provide: EnrichmentQueueService, useValue: enrichmentQueue },
        { provide: LufsAnalysisQueueService, useValue: lufsQueue },
        { provide: DjAnalysisQueueService, useValue: djQueue },
        { provide: SettingsService, useValue: settingsService },
        { provide: getLoggerToken(PostScanTasksService.name), useValue: mockLogger },
      ],
    }).compile();

    service = module.get(PostScanTasksService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('runAll', () => {
    it('should run all three post-scan tasks', async () => {
      settingsService.getBoolean!.mockResolvedValue(true);
      enrichmentQueue.startEnrichmentQueue!.mockResolvedValue({
        started: true,
        pending: 5,
        message: 'ok',
      });
      lufsQueue.startLufsAnalysisQueue!.mockResolvedValue({
        started: true,
        pending: 3,
        message: 'ok',
      });
      djQueue.startAnalysisQueue!.mockResolvedValue({
        started: true,
        pending: 2,
        message: 'ok',
      });

      await service.runAll();

      expect(enrichmentQueue.startEnrichmentQueue).toHaveBeenCalled();
      expect(lufsQueue.startLufsAnalysisQueue).toHaveBeenCalled();
      expect(djQueue.startAnalysisQueue).toHaveBeenCalled();
    });
  });

  describe('performAutoEnrichment', () => {
    it('should skip when disabled in settings', async () => {
      settingsService.getBoolean!.mockResolvedValue(false);

      await service.performAutoEnrichment();

      expect(enrichmentQueue.startEnrichmentQueue).not.toHaveBeenCalled();
    });

    it('should start enrichment queue when enabled', async () => {
      settingsService.getBoolean!.mockResolvedValue(true);
      enrichmentQueue.startEnrichmentQueue!.mockResolvedValue({
        started: true,
        pending: 10,
        message: 'ok',
      });

      await service.performAutoEnrichment();

      expect(enrichmentQueue.startEnrichmentQueue).toHaveBeenCalled();
    });

    it('should catch and log errors without throwing', async () => {
      settingsService.getBoolean!.mockResolvedValue(true);
      enrichmentQueue.startEnrichmentQueue!.mockRejectedValue(new Error('queue error'));

      await expect(service.performAutoEnrichment()).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('startLufsAnalysis', () => {
    it('should skip when disabled in settings', async () => {
      settingsService.getBoolean!.mockResolvedValue(false);

      await service.startLufsAnalysis();

      expect(lufsQueue.startLufsAnalysisQueue).not.toHaveBeenCalled();
    });

    it('should start LUFS queue when enabled', async () => {
      settingsService.getBoolean!.mockResolvedValue(true);
      lufsQueue.startLufsAnalysisQueue!.mockResolvedValue({
        started: true,
        pending: 5,
        message: 'ok',
      });

      await service.startLufsAnalysis();

      expect(lufsQueue.startLufsAnalysisQueue).toHaveBeenCalled();
    });

    it('should catch and log errors without throwing', async () => {
      settingsService.getBoolean!.mockResolvedValue(true);
      lufsQueue.startLufsAnalysisQueue!.mockRejectedValue(new Error('lufs error'));

      await expect(service.startLufsAnalysis()).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('startDjAnalysis', () => {
    it('should skip when disabled in settings', async () => {
      settingsService.getBoolean!.mockResolvedValue(false);

      await service.startDjAnalysis();

      expect(djQueue.startAnalysisQueue).not.toHaveBeenCalled();
    });

    it('should start DJ queue when enabled', async () => {
      settingsService.getBoolean!.mockResolvedValue(true);
      djQueue.startAnalysisQueue!.mockResolvedValue({
        started: true,
        pending: 3,
        message: 'ok',
      });

      await service.startDjAnalysis();

      expect(djQueue.startAnalysisQueue).toHaveBeenCalled();
    });

    it('should catch and log errors without throwing', async () => {
      settingsService.getBoolean!.mockResolvedValue(true);
      djQueue.startAnalysisQueue!.mockRejectedValue(new Error('dj error'));

      await expect(service.startDjAnalysis()).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
