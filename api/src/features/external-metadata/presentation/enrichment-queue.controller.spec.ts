import { Test, TestingModule } from '@nestjs/testing';
import { EnrichmentQueueController } from './enrichment-queue.controller';
import { EnrichmentQueueService } from '../infrastructure/services/enrichment-queue.service';
import { getLoggerToken } from 'nestjs-pino';

describe('EnrichmentQueueController', () => {
  let controller: EnrichmentQueueController;
  let enrichmentQueue: jest.Mocked<EnrichmentQueueService>;

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrichmentQueueController],
      providers: [
        {
          provide: getLoggerToken(EnrichmentQueueController.name),
          useValue: mockLogger,
        },
        {
          provide: EnrichmentQueueService,
          useValue: {
            getQueueStats: jest.fn(),
            startEnrichmentQueue: jest.fn(),
            stopEnrichmentQueue: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EnrichmentQueueController>(EnrichmentQueueController);
    enrichmentQueue = module.get(EnrichmentQueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEnrichmentQueueStats', () => {
    it('should return queue statistics', async () => {
      const mockStats = {
        isRunning: true,
        pendingArtists: 50,
        pendingAlbums: 200,
        totalPending: 250,
        processedInSession: 100,
        currentItem: 'Artist Name',
        startedAt: new Date(),
        estimatedTimeRemaining: '2h 30m',
      };

      enrichmentQueue.getQueueStats.mockResolvedValue(mockStats);

      const result = await controller.getEnrichmentQueueStats();

      expect(result.isRunning).toBe(true);
      expect(result.pendingArtists).toBe(50);
      expect(result.pendingAlbums).toBe(200);
      expect(result.currentItem).toBe('Artist Name');
    });
  });

  describe('startEnrichmentQueue', () => {
    it('should start the enrichment queue', async () => {
      const mockResult = {
        started: true,
        pending: 250,
        message: 'Enrichment queue started',
      };

      enrichmentQueue.startEnrichmentQueue.mockResolvedValue(mockResult);

      const result = await controller.startEnrichmentQueue();

      expect(result.started).toBe(true);
      expect(result.pending).toBe(250);
      expect(enrichmentQueue.startEnrichmentQueue).toHaveBeenCalled();
    });

    it('should handle already running queue', async () => {
      const mockResult = {
        started: false,
        pending: 0,
        message: 'Queue already running',
      };

      enrichmentQueue.startEnrichmentQueue.mockResolvedValue(mockResult);

      const result = await controller.startEnrichmentQueue();

      expect(result.started).toBe(false);
    });
  });

  describe('stopEnrichmentQueue', () => {
    it('should stop the enrichment queue', async () => {
      enrichmentQueue.stopEnrichmentQueue.mockResolvedValue(undefined);

      const result = await controller.stopEnrichmentQueue();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Enrichment queue stopped');
      expect(enrichmentQueue.stopEnrichmentQueue).toHaveBeenCalled();
    });

    it('should propagate errors', async () => {
      enrichmentQueue.stopEnrichmentQueue.mockRejectedValue(new Error('Stop failed'));

      await expect(controller.stopEnrichmentQueue()).rejects.toThrow('Stop failed');
    });
  });
});
