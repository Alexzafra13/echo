import { RedisService } from './redis.service';

// Mock ioredis
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
  flushdb: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
  status: 'ready',
};

jest.mock('ioredis', () => ({
  Redis: jest.fn(() => mockRedis),
}));

jest.mock('@config/cache.config', () => ({
  cacheConfig: {
    redis_host: 'localhost',
    redis_port: 6379,
    redis_password: '',
  },
}));

describe('RedisService', () => {
  let service: RedisService;

  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis.status = 'ready';

    service = new (RedisService as unknown as new (logger: typeof mockLogger) => RedisService)(
      mockLogger
    );
    await service.onModuleInit();
  });

  describe('onModuleInit', () => {
    it('should register event handlers on init', async () => {
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });
  });

  describe('connected', () => {
    it('should return false initially (no connect event fired)', () => {
      expect(service.connected).toBe(false);
    });

    it('should return false when redis status is not ready', () => {
      mockRedis.status = 'connecting';
      expect(service.connected).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should call redis.quit()', async () => {
      await service.onModuleDestroy();
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should return parsed JSON for existing key', async () => {
      mockRedis.get.mockResolvedValue('{"name":"test","value":42}');

      const result = await service.get('my-key');

      expect(result).toEqual({ name: 'test', value: 42 });
      expect(mockRedis.get).toHaveBeenCalledWith('my-key');
    });

    it('should return null for non-existing key', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('missing-key');

      expect(result).toBeNull();
    });

    it('should return null and log warning on error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Connection refused'));

      const result = await service.get('broken-key');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { key: 'broken-key', error: 'Connection refused' },
        'Redis get failed'
      );
    });

    it('should handle arrays', async () => {
      mockRedis.get.mockResolvedValue('[1,2,3]');

      const result = await service.get('array-key');

      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('set', () => {
    it('should serialize and store value without TTL', async () => {
      await service.set('key', { data: 'value' });

      expect(mockRedis.set).toHaveBeenCalledWith('key', '{"data":"value"}');
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should use setex when TTL is provided', async () => {
      await service.set('key', { data: 'value' }, 300);

      expect(mockRedis.setex).toHaveBeenCalledWith('key', 300, '{"data":"value"}');
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should use set (not setex) when TTL is 0', async () => {
      await service.set('key', 'value', 0);

      expect(mockRedis.set).toHaveBeenCalledWith('key', '"value"');
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should log warning on error without throwing', async () => {
      mockRedis.set.mockRejectedValue(new Error('Write failed'));

      await expect(service.set('key', 'value')).resolves.toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { key: 'key', error: 'Write failed' },
        'Redis set failed'
      );
    });
  });

  describe('del', () => {
    it('should delete a key', async () => {
      await service.del('key-to-delete');

      expect(mockRedis.del).toHaveBeenCalledWith('key-to-delete');
    });

    it('should log warning on error without throwing', async () => {
      mockRedis.del.mockRejectedValue(new Error('Delete failed'));

      await expect(service.del('key')).resolves.toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { key: 'key', error: 'Delete failed' },
        'Redis del failed'
      );
    });
  });

  describe('delPattern', () => {
    it('should scan and delete matching keys', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', ['albums:1', 'albums:2', 'albums:3']]);
      mockRedis.del.mockResolvedValue(3);

      await service.delPattern('albums:*');

      expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'albums:*', 'COUNT', 100);
      expect(mockRedis.del).toHaveBeenCalledWith('albums:1', 'albums:2', 'albums:3');
    });

    it('should handle multiple scan iterations', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['42', ['key:1', 'key:2']])
        .mockResolvedValueOnce(['0', ['key:3']]);
      mockRedis.del.mockResolvedValue(3);

      await service.delPattern('key:*');

      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledWith('key:1', 'key:2', 'key:3');
    });

    it('should not call del when no keys match', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', []]);

      await service.delPattern('nonexistent:*');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should batch delete in groups of 100', async () => {
      const keys = Array.from({ length: 150 }, (_, i) => `key:${i}`);
      mockRedis.scan.mockResolvedValueOnce(['0', keys]);
      mockRedis.del.mockResolvedValue(100);

      await service.delPattern('key:*');

      expect(mockRedis.del).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenNthCalledWith(1, ...keys.slice(0, 100));
      expect(mockRedis.del).toHaveBeenNthCalledWith(2, ...keys.slice(100));
    });

    it('should log warning on error without throwing', async () => {
      mockRedis.scan.mockRejectedValue(new Error('Scan failed'));

      await expect(service.delPattern('key:*')).resolves.toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { pattern: 'key:*', error: 'Scan failed' },
        'Redis delPattern failed'
      );
    });
  });

  describe('clear', () => {
    it('should call flushdb', async () => {
      await service.clear();

      expect(mockRedis.flushdb).toHaveBeenCalled();
    });
  });

  describe('ping', () => {
    it('should return true when redis responds PONG', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const result = await service.ping();

      expect(result).toBe(true);
    });

    it('should return false when redis responds differently', async () => {
      mockRedis.ping.mockResolvedValue('ERROR');

      const result = await service.ping();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection lost'));

      const result = await service.ping();

      expect(result).toBe(false);
    });
  });
});
