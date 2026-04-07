import { TokenBlacklistService } from './token-blacklist.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { createMockPinoLogger, MockPinoLogger } from '@shared/testing/mock.types';
import { PinoLogger } from 'nestjs-pino';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let mockRedis: jest.Mocked<Pick<RedisService, 'set' | 'get'>>;
  let mockLogger: MockPinoLogger;

  beforeEach(() => {
    mockRedis = {
      set: jest.fn(),
      get: jest.fn(),
    };

    mockLogger = createMockPinoLogger();

    service = new TokenBlacklistService(
      mockLogger as unknown as PinoLogger,
      mockRedis as unknown as RedisService
    );
  });

  describe('add', () => {
    it('should store token in Redis with correct TTL', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + 3600; // 1 hour from now

      await service.add('jti-abc-123', expiresAt);

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('token:blacklist:'),
        { invalidatedAt: expect.any(Number) },
        expect.any(Number)
      );

      // TTL should be approximately 3600 (allow small timing drift)
      const ttlArg = mockRedis.set.mock.calls[0][2] as number;
      expect(ttlArg).toBeGreaterThan(3590);
      expect(ttlArg).toBeLessThanOrEqual(3600);
    });

    it('should use SHA256 hash as Redis key', async () => {
      const now = Math.floor(Date.now() / 1000);
      await service.add('my-token-jti', now + 100);

      const key = mockRedis.set.mock.calls[0][0] as string;
      expect(key).toMatch(/^token:blacklist:[a-f0-9]{64}$/);
    });

    it('should generate consistent keys for the same input', async () => {
      const now = Math.floor(Date.now() / 1000);

      await service.add('same-jti', now + 100);
      await service.add('same-jti', now + 200);

      const key1 = mockRedis.set.mock.calls[0][0];
      const key2 = mockRedis.set.mock.calls[1][0];
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', async () => {
      const now = Math.floor(Date.now() / 1000);

      await service.add('jti-aaa', now + 100);
      await service.add('jti-bbb', now + 100);

      const key1 = mockRedis.set.mock.calls[0][0];
      const key2 = mockRedis.set.mock.calls[1][0];
      expect(key1).not.toBe(key2);
    });

    it('should skip blacklist when token is already expired (TTL <= 0)', async () => {
      const now = Math.floor(Date.now() / 1000);
      const alreadyExpired = now - 10;

      await service.add('expired-jti', alreadyExpired);

      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Token already expired, skipping blacklist');
    });

    it('should skip blacklist when expiresAt equals current time (TTL = 0)', async () => {
      const now = Math.floor(Date.now() / 1000);

      await service.add('edge-jti', now);

      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should handle token about to expire (TTL = 1 second)', async () => {
      const now = Math.floor(Date.now() / 1000);

      await service.add('almost-expired-jti', now + 1);

      expect(mockRedis.set).toHaveBeenCalled();
      const ttlArg = mockRedis.set.mock.calls[0][2] as number;
      expect(ttlArg).toBe(1);
    });

    it('should propagate Redis errors', async () => {
      const now = Math.floor(Date.now() / 1000);
      mockRedis.set.mockRejectedValue(new Error('Redis connection refused'));

      await expect(service.add('jti-123', now + 3600)).rejects.toThrow('Redis connection refused');
    });
  });

  describe('isBlacklisted', () => {
    it('should return true when token is in blacklist', async () => {
      mockRedis.get.mockResolvedValue({ invalidatedAt: 1700000000 });

      const result = await service.isBlacklisted('blacklisted-jti');

      expect(result).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith(expect.stringContaining('token:blacklist:'));
    });

    it('should return false when token is not in blacklist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.isBlacklisted('valid-jti');

      expect(result).toBe(false);
    });

    it('should use same key format as add()', async () => {
      const now = Math.floor(Date.now() / 1000);
      mockRedis.get.mockResolvedValue(null);

      await service.add('shared-jti', now + 100);
      await service.isBlacklisted('shared-jti');

      const addKey = mockRedis.set.mock.calls[0][0];
      const checkKey = mockRedis.get.mock.calls[0][0];
      expect(addKey).toBe(checkKey);
    });

    it('should propagate Redis errors', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis timeout'));

      await expect(service.isBlacklisted('jti-123')).rejects.toThrow('Redis timeout');
    });
  });
});
