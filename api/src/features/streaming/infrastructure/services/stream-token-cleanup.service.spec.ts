import { StreamTokenCleanupService } from './stream-token-cleanup.service';
import { StreamTokenService } from './stream-token.service';
import { createMockPinoLogger, MockPinoLogger } from '@shared/testing/mock.types';
import { PinoLogger } from 'nestjs-pino';

describe('StreamTokenCleanupService', () => {
  let service: StreamTokenCleanupService;
  let mockStreamTokenService: { cleanupExpiredTokens: jest.Mock };
  let mockLogger: MockPinoLogger;

  beforeEach(() => {
    mockStreamTokenService = {
      cleanupExpiredTokens: jest.fn(),
    };

    mockLogger = createMockPinoLogger();

    service = new StreamTokenCleanupService(
      mockLogger as unknown as PinoLogger,
      mockStreamTokenService as unknown as StreamTokenService
    );
  });

  describe('handleCleanup', () => {
    it('should call cleanupExpiredTokens', async () => {
      mockStreamTokenService.cleanupExpiredTokens.mockResolvedValue(0);

      await service.handleCleanup();

      expect(mockStreamTokenService.cleanupExpiredTokens).toHaveBeenCalled();
    });

    it('should log info when tokens are cleaned up', async () => {
      mockStreamTokenService.cleanupExpiredTokens.mockResolvedValue(5);

      await service.handleCleanup();

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('5'));
    });

    it('should not log when no tokens are cleaned up', async () => {
      mockStreamTokenService.cleanupExpiredTokens.mockResolvedValue(0);

      await service.handleCleanup();

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should catch and log errors without propagating', async () => {
      mockStreamTokenService.cleanupExpiredTokens.mockRejectedValue(
        new Error('DB connection failed')
      );

      // Should not throw
      await expect(service.handleCleanup()).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('cleanup'),
        expect.any(Error)
      );
    });
  });
});
