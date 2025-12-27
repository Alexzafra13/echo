import Redis from 'ioredis';
import { cacheConfig } from '../../src/config/cache.config';

/**
 * Rate Limiting Integration Tests
 *
 * These tests verify Redis operations that support rate limiting.
 * They test the underlying Redis functionality used by the throttler.
 *
 * Rate limiting in production uses the WsThrottlerGuard (for WebSocket)
 * and NestJS ThrottlerGuard (for HTTP), both backed by Redis.
 */
describe('Rate Limiting Integration', () => {
  let redis: Redis;

  beforeAll(async () => {
    // Create Redis client
    redis = new Redis({
      host: cacheConfig.redis_host,
      port: cacheConfig.redis_port,
      password: cacheConfig.redis_password,
      db: parseInt(process.env.REDIS_DB || '11'),
    });
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(async () => {
    // Clear rate limiting keys before each test
    const keys = await redis.keys('test:throttle:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('Redis Rate Limiting Primitives', () => {
    it('debería verificar conexión a Redis', async () => {
      // Act
      const pong = await redis.ping();

      // Assert
      expect(pong).toBe('PONG');
    });

    it('debería soportar operaciones INCR para conteo de requests', async () => {
      // Arrange
      const counterKey = 'test:throttle:counter';

      // Act - Simulate 3 requests
      await redis.del(counterKey);
      const val1 = await redis.incr(counterKey);
      const val2 = await redis.incr(counterKey);
      const val3 = await redis.incr(counterKey);

      // Assert
      expect(val1).toBe(1);
      expect(val2).toBe(2);
      expect(val3).toBe(3);

      // Cleanup
      await redis.del(counterKey);
    });

    it('debería soportar TTL para ventana de rate limiting', async () => {
      // Arrange
      const ttlKey = 'test:throttle:window';

      // Act - Set key with 1 second TTL (simulating rate limit window)
      await redis.set(ttlKey, '1', 'EX', 1);
      const beforeExpiry = await redis.get(ttlKey);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const afterExpiry = await redis.get(ttlKey);

      // Assert
      expect(beforeExpiry).toBe('1');
      expect(afterExpiry).toBeNull();
    });

    it('debería manejar INCR con EXPIRE para rate limiting', async () => {
      // Arrange
      const key = 'test:throttle:ip:192.168.1.1';
      await redis.del(key);

      // Act - Simulate rate limiting: increment and set TTL atomically
      const multi = redis.multi();
      multi.incr(key);
      multi.expire(key, 60); // 60 second window
      const results = await multi.exec();

      // Assert
      expect(results).not.toBeNull();
      expect(results![0][1]).toBe(1); // First increment = 1
      expect(results![1][1]).toBe(1); // expire returns 1 on success

      // Verify TTL was set
      const ttl = await redis.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);

      // Cleanup
      await redis.del(key);
    });

    it('debería trackear diferentes clientes independientemente', async () => {
      // Arrange
      const client1Key = 'test:throttle:ip:10.0.0.1';
      const client2Key = 'test:throttle:ip:10.0.0.2';
      await redis.del(client1Key, client2Key);

      // Act - Client 1 makes 5 requests
      for (let i = 0; i < 5; i++) {
        await redis.incr(client1Key);
      }

      // Client 2 makes 2 requests
      for (let i = 0; i < 2; i++) {
        await redis.incr(client2Key);
      }

      // Assert - Each client has independent count
      const client1Count = await redis.get(client1Key);
      const client2Count = await redis.get(client2Key);

      expect(client1Count).toBe('5');
      expect(client2Count).toBe('2');

      // Cleanup
      await redis.del(client1Key, client2Key);
    });

    it('debería resetear contador después de expiración de ventana', async () => {
      // Arrange
      const key = 'test:throttle:reset-test';
      await redis.del(key);

      // Act - Set counter with 1 second TTL
      await redis.incr(key);
      await redis.incr(key);
      await redis.incr(key);
      await redis.expire(key, 1);

      const beforeReset = await redis.get(key);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Start new window
      await redis.incr(key);
      const afterReset = await redis.get(key);

      // Assert
      expect(beforeReset).toBe('3');
      expect(afterReset).toBe('1'); // Counter reset to 1

      // Cleanup
      await redis.del(key);
    });

    it('debería soportar sliding window con sorted sets', async () => {
      // Arrange - Sliding window rate limiting using sorted sets
      const key = 'test:throttle:sliding:user123';
      const now = Date.now();
      const windowMs = 1000; // 1 second window
      await redis.del(key);

      // Act - Add timestamps for 3 requests
      await redis.zadd(key, now - 500, `req1`);
      await redis.zadd(key, now - 250, `req2`);
      await redis.zadd(key, now, `req3`);

      // Remove old entries outside the window
      await redis.zremrangebyscore(key, '-inf', now - windowMs);

      // Count requests in current window
      const count = await redis.zcard(key);

      // Assert
      expect(count).toBe(3);

      // Cleanup
      await redis.del(key);
    });
  });

  describe('Rate Limiting Logic Simulation', () => {
    const RATE_LIMIT = 5; // 5 requests per window
    const WINDOW_SECONDS = 60;

    async function checkRateLimit(clientId: string): Promise<{ allowed: boolean; remaining: number }> {
      const key = `test:throttle:client:${clientId}`;

      const multi = redis.multi();
      multi.incr(key);
      multi.expire(key, WINDOW_SECONDS);
      const results = await multi.exec();

      const currentCount = results![0][1] as number;
      const allowed = currentCount <= RATE_LIMIT;
      const remaining = Math.max(0, RATE_LIMIT - currentCount);

      return { allowed, remaining };
    }

    it('debería permitir requests dentro del límite', async () => {
      // Arrange
      const clientId = 'allowed-client';
      await redis.del(`test:throttle:client:${clientId}`);

      // Act - Make 5 requests (at limit)
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await checkRateLimit(clientId));
      }

      // Assert - All should be allowed
      expect(results.every(r => r.allowed)).toBe(true);
      expect(results[0].remaining).toBe(4);
      expect(results[4].remaining).toBe(0);

      // Cleanup
      await redis.del(`test:throttle:client:${clientId}`);
    });

    it('debería bloquear requests que exceden el límite', async () => {
      // Arrange
      const clientId = 'blocked-client';
      await redis.del(`test:throttle:client:${clientId}`);

      // Act - Make 7 requests (exceeds limit of 5)
      const results = [];
      for (let i = 0; i < 7; i++) {
        results.push(await checkRateLimit(clientId));
      }

      // Assert - First 5 allowed, last 2 blocked
      expect(results.slice(0, 5).every(r => r.allowed)).toBe(true);
      expect(results.slice(5).every(r => !r.allowed)).toBe(true);

      // Cleanup
      await redis.del(`test:throttle:client:${clientId}`);
    });
  });
});
