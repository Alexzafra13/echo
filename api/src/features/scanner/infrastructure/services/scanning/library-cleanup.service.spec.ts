import { LibraryCleanupService } from './library-cleanup.service';
import { createMockPinoLogger } from '@shared/testing/mock.types';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { FileScannerService } from '../file-scanner.service';
import { SettingsService } from '@infrastructure/settings';
import { PinoLogger } from 'nestjs-pino';

/**
 * Tests for LibraryCleanupService business logic.
 *
 * This service does direct Drizzle queries, so we mock the db chain methods.
 * Focus: decision logic in handleMissingFile, getPurgeMode, unmarkMissing.
 */
describe('LibraryCleanupService', () => {
  let service: LibraryCleanupService;
  let mockDrizzle: {
    db: { select: jest.Mock; update: jest.Mock; delete: jest.Mock; execute: jest.Mock };
  };
  let mockFileScanner: Record<string, unknown>;
  let mockSettingsService: { getString: jest.Mock };
  let mockLogger: ReturnType<typeof createMockPinoLogger>;

  // Chainable query builder mock
  const createSelectChain = (result: unknown[] = []) => ({
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
    orderBy: jest.fn().mockResolvedValue(result),
  });

  const createUpdateChain = (result: unknown[] = []) => ({
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(result),
  });

  const _createDeleteChain = () => ({
    where: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    mockLogger = createMockPinoLogger();
    mockSettingsService = { getString: jest.fn() };
    mockFileScanner = {};

    mockDrizzle = {
      db: {
        select: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        execute: jest.fn(),
      },
    };

    service = new LibraryCleanupService(
      mockDrizzle as unknown as DrizzleService,
      mockFileScanner as unknown as FileScannerService,
      mockSettingsService as unknown as SettingsService,
      mockLogger as unknown as PinoLogger
    );
  });

  describe('getPurgeMode', () => {
    it('should return purge mode from settings', async () => {
      mockSettingsService.getString.mockResolvedValue('always');

      const mode = await service.getPurgeMode();

      expect(mode).toBe('always');
      expect(mockSettingsService.getString).toHaveBeenCalledWith('library.purgeMissing', 'never');
    });

    it('should default to never', async () => {
      mockSettingsService.getString.mockResolvedValue('never');

      const mode = await service.getPurgeMode();

      expect(mode).toBe('never');
    });
  });

  describe('handleMissingFile', () => {
    it('should return empty result when track not found in DB', async () => {
      mockDrizzle.db.select.mockReturnValue(createSelectChain([]));

      const result = await service.handleMissingFile('/music/nonexistent.mp3');

      expect(result.trackMarkedMissing).toBe(false);
      expect(result.trackDeleted).toBe(false);
    });

    it('should return empty result when track already marked as missing', async () => {
      mockDrizzle.db.select.mockReturnValue(
        createSelectChain([
          { id: 'track-1', title: 'Song', albumId: 'album-1', missingAt: new Date() },
        ])
      );

      const result = await service.handleMissingFile('/music/old-missing.mp3');

      expect(result.trackMarkedMissing).toBe(false);
      expect(result.trackDeleted).toBe(false);
    });

    it('should mark track as missing when purge mode is never', async () => {
      mockDrizzle.db.select.mockReturnValue(
        createSelectChain([{ id: 'track-1', title: 'Song', albumId: 'album-1', missingAt: null }])
      );
      mockSettingsService.getString.mockResolvedValue('never');
      mockDrizzle.db.update.mockReturnValue(createUpdateChain());

      const result = await service.handleMissingFile('/music/gone.mp3');

      expect(result.trackMarkedMissing).toBe(true);
      expect(result.trackDeleted).toBe(false);
      expect(mockDrizzle.db.update).toHaveBeenCalled();
    });

    it('should catch and handle errors gracefully', async () => {
      mockDrizzle.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const result = await service.handleMissingFile('/music/error.mp3');

      expect(result.trackMarkedMissing).toBe(false);
      expect(result.trackDeleted).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('unmarkMissing', () => {
    it('should return true when track is successfully unmarked', async () => {
      mockDrizzle.db.update.mockReturnValue(createUpdateChain([{ id: 'track-1' }]));

      const result = await service.unmarkMissing('/music/found.mp3');

      expect(result).toBe(true);
    });

    it('should return false when track not found', async () => {
      mockDrizzle.db.update.mockReturnValue(createUpdateChain([]));

      const result = await service.unmarkMissing('/music/unknown.mp3');

      expect(result).toBe(false);
    });

    it('should return false and log on error', async () => {
      mockDrizzle.db.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      const result = await service.unmarkMissing('/music/error.mp3');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('cleanupOrphanedAlbum', () => {
    it('should not delete album if it still has tracks', async () => {
      mockDrizzle.db.select.mockReturnValue(createSelectChain([{ id: 'track-remaining' }]));

      await service.cleanupOrphanedAlbum('album-1');

      expect(mockDrizzle.db.delete).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDrizzle.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Query failed')),
      });

      // Should not throw
      await expect(service.cleanupOrphanedAlbum('album-1')).resolves.toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
