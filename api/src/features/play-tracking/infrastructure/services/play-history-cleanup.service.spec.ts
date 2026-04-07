import { PlayHistoryCleanupService } from './play-history-cleanup.service';
import { PinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';

describe('PlayHistoryCleanupService', () => {
  let service: PlayHistoryCleanupService;
  let mockExecute: jest.Mock;
  let mockLogger: { info: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    mockExecute = jest.fn();

    const mockDrizzle = {
      db: { execute: mockExecute },
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    service = new PlayHistoryCleanupService(
      mockLogger as unknown as PinoLogger,
      mockDrizzle as unknown as DrizzleService
    );
  });

  describe('handleCleanup', () => {
    it('should delete entries older than 180 days and log count', async () => {
      mockExecute.mockResolvedValue({ rowCount: 3 });

      await service.handleCleanup();

      expect(mockExecute).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ deletedCount: 3, retentionDays: 180 }),
        expect.stringContaining('removed 3 entries')
      );
    });

    it('should not log when no entries are deleted', async () => {
      mockExecute.mockResolvedValue({ rowCount: 0 });

      await service.handleCleanup();

      expect(mockExecute).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockExecute.mockRejectedValue(new Error('DB connection lost'));

      await service.handleCleanup();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'Failed to clean up play history'
      );
    });
  });
});
