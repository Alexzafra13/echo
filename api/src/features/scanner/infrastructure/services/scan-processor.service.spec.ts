import { ScanProcessorService } from './scan-processor.service';
import { createMockPinoLogger } from '@shared/testing/mock.types';
import { IScannerRepository } from '../../domain/ports/scanner-repository.port';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { FileScannerService } from './file-scanner.service';
import { ScannerGateway } from '../gateways/scanner.gateway';
import { CachedAlbumRepository } from '@features/albums/infrastructure/persistence/cached-album.repository';
import { CachedGenreRepository } from '@features/genres/infrastructure/persistence/cached-genre.repository';
import { SettingsService } from '@infrastructure/settings';
import { LogService } from '@features/logs/application/log.service';
import {
  TrackProcessingService,
  LibraryCleanupService as ScanningLibraryCleanupService,
} from './scanning';
import { PostScanTasksService } from './post-scan-tasks.service';
import { NotificationsService } from '@features/notifications/application/notifications.service';
import { VideoProcessingService } from './scanning/video-processing.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { PinoLogger } from 'nestjs-pino';

/**
 * Tests for ScanProcessorService's scan control logic (pause/cancel/resume).
 *
 * We instantiate the service directly (not via NestJS DI) because:
 * 1. The service has 13 dependencies — mocking them all via TestingModule is brittle
 * 2. We only test the control-flow methods that use internal Maps (scanSignals, pauseResolvers)
 * 3. The signal/pause mechanism is pure logic, no infrastructure needed
 */
describe('ScanProcessorService', () => {
  let service: ScanProcessorService;
  let mockScannerRepository: {
    findById: jest.Mock;
    update: jest.Mock;
  };
  let mockRedis: { setNX: jest.Mock };
  let mockBullmq: { addJob: jest.Mock; registerProcessor: jest.Mock };
  let mockSettingsService: { getString: jest.Mock };
  let mockLogger: ReturnType<typeof createMockPinoLogger>;

  beforeEach(() => {
    mockScannerRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    mockRedis = { setNX: jest.fn() };
    mockBullmq = { addJob: jest.fn(), registerProcessor: jest.fn() };
    mockSettingsService = { getString: jest.fn() };
    mockLogger = createMockPinoLogger();

    // Instantiate directly with minimal mocks — only the deps used by control methods
    service = new ScanProcessorService(
      mockScannerRepository as unknown as IScannerRepository,
      mockBullmq as unknown as BullmqService,
      {} as unknown as FileScannerService,
      {} as unknown as ScannerGateway,
      {} as unknown as CachedAlbumRepository,
      {} as unknown as CachedGenreRepository,
      mockSettingsService as unknown as SettingsService,
      { info: jest.fn() } as unknown as LogService,
      {} as unknown as TrackProcessingService,
      {} as unknown as ScanningLibraryCleanupService,
      {} as unknown as PostScanTasksService,
      {} as unknown as NotificationsService,
      {} as unknown as VideoProcessingService,
      mockRedis as unknown as RedisService,
      mockLogger as unknown as PinoLogger
    );
  });

  describe('pauseScan', () => {
    it('should return true and set signal for a running scan', async () => {
      mockScannerRepository.findById.mockResolvedValue({ status: 'running' });

      const result = await service.pauseScan('scan-1');

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should return false when scan does not exist', async () => {
      mockScannerRepository.findById.mockResolvedValue(null);

      const result = await service.pauseScan('non-existent');

      expect(result).toBe(false);
    });

    it('should return false when scan is not running', async () => {
      mockScannerRepository.findById.mockResolvedValue({ status: 'completed' });

      const result = await service.pauseScan('scan-1');

      expect(result).toBe(false);
    });
  });

  describe('cancelScan', () => {
    it('should return true for a running scan', async () => {
      mockScannerRepository.findById.mockResolvedValue({ status: 'running' });

      const result = await service.cancelScan('scan-1');

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should return true for a paused scan', async () => {
      mockScannerRepository.findById.mockResolvedValue({ status: 'paused' });

      const result = await service.cancelScan('scan-1');

      expect(result).toBe(true);
    });

    it('should return false for a completed scan', async () => {
      mockScannerRepository.findById.mockResolvedValue({ status: 'completed' });

      const result = await service.cancelScan('scan-1');

      expect(result).toBe(false);
    });

    it('should return false when scan does not exist', async () => {
      mockScannerRepository.findById.mockResolvedValue(null);

      const result = await service.cancelScan('non-existent');

      expect(result).toBe(false);
    });

    it('should log reason when provided', async () => {
      mockScannerRepository.findById.mockResolvedValue({ status: 'running' });

      await service.cancelScan('scan-1', 'User requested cancel');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('User requested cancel')
      );
    });
  });

  describe('resumeScan', () => {
    it('should return true and update status for a paused scan', async () => {
      mockScannerRepository.findById.mockResolvedValue({ status: 'paused' });
      mockScannerRepository.update.mockResolvedValue(undefined);

      const result = await service.resumeScan('scan-1');

      expect(result).toBe(true);
      expect(mockScannerRepository.update).toHaveBeenCalledWith('scan-1', {
        status: 'running',
      });
    });

    it('should return false when scan is not paused', async () => {
      mockScannerRepository.findById.mockResolvedValue({ status: 'running' });

      const result = await service.resumeScan('scan-1');

      expect(result).toBe(false);
    });

    it('should return false when scan does not exist', async () => {
      mockScannerRepository.findById.mockResolvedValue(null);

      const result = await service.resumeScan('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('pause → resume flow', () => {
    it('should allow resuming after pause (cancel → resume race)', async () => {
      // Pause
      mockScannerRepository.findById.mockResolvedValue({ status: 'running' });
      await service.pauseScan('scan-1');

      // Resume
      mockScannerRepository.findById.mockResolvedValue({ status: 'paused' });
      const resumed = await service.resumeScan('scan-1');

      expect(resumed).toBe(true);
    });
  });

  describe('pause → cancel flow', () => {
    it('should allow canceling a paused scan', async () => {
      // Pause
      mockScannerRepository.findById.mockResolvedValue({ status: 'running' });
      await service.pauseScan('scan-1');

      // Cancel the paused scan
      mockScannerRepository.findById.mockResolvedValue({ status: 'paused' });
      const cancelled = await service.cancelScan('scan-1');

      expect(cancelled).toBe(true);
    });
  });

  describe('enqueueScan', () => {
    it('should acquire Redis lock and enqueue job', async () => {
      mockRedis.setNX.mockResolvedValue(true);
      mockSettingsService.getString.mockResolvedValue('/music');
      mockBullmq.addJob.mockResolvedValue(undefined);

      await service.enqueueScan('scan-1', { recursive: true, pruneDeleted: true });

      expect(mockRedis.setNX).toHaveBeenCalledWith('scan:lock', 'scan-1', 3600);
      expect(mockBullmq.addJob).toHaveBeenCalledWith(
        'library-scan',
        'scan',
        expect.objectContaining({
          scanId: 'scan-1',
          path: '/music',
          recursive: true,
          pruneDeleted: true,
        }),
        expect.any(Object)
      );
    });

    it('should throw SCAN_ALREADY_RUNNING when lock not acquired', async () => {
      mockRedis.setNX.mockResolvedValue(false);

      await expect(service.enqueueScan('scan-2')).rejects.toThrow('scan is already running');
    });

    it('should use custom path when provided', async () => {
      mockRedis.setNX.mockResolvedValue(true);
      mockBullmq.addJob.mockResolvedValue(undefined);

      await service.enqueueScan('scan-1', { path: '/custom/path' });

      const jobData = mockBullmq.addJob.mock.calls[0][2];
      expect(jobData.path).toBe('/custom/path');
    });
  });
});
