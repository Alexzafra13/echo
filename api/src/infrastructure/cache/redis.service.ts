import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Redis } from 'ioredis';
import { cacheConfig } from '@config/cache.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redis!: Redis;
  private isConnected = false;
  private readonly operationTimeout = 1000; // 1 second timeout for operations

  constructor(
    @InjectPinoLogger(RedisService.name)
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit() {
    this.redis = new Redis({
      host: cacheConfig.redis_host,
      port: cacheConfig.redis_port,
      password: cacheConfig.redis_password,
      connectTimeout: 5000, // 5 seconds to connect
      commandTimeout: 1000, // 1 second for commands
      maxRetriesPerRequest: 1, // Don't retry forever
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.warn('Redis connection failed after 3 retries, disabling cache');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 1000); // Retry with backoff
      },
      lazyConnect: true, // Don't block startup
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      this.logger.info({
        host: cacheConfig.redis_host,
        port: cacheConfig.redis_port,
      }, 'Redis connected');
    });

    this.redis.on('error', (err) => {
      this.isConnected = false;
      this.logger.error({
        error: err.message,
        host: cacheConfig.redis_host,
        port: cacheConfig.redis_port,
      }, 'Redis error');
    });

    this.redis.on('close', () => {
      this.isConnected = false;
    });

    // Try to connect but don't block if it fails
    try {
      await this.redis.connect();
    } catch (err) {
      this.logger.warn({ error: err instanceof Error ? err.message : err }, 'Redis initial connection failed, cache disabled');
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.redis.quit();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const data = await Promise.race([
        this.redis.get(key),
        this.timeout<string | null>(this.operationTimeout),
      ]);
      return data ? (JSON.parse(data) as T) : null;
    } catch {
      return null; // Fail silently, just skip cache
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.isConnected) return;

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await Promise.race([
          this.redis.setex(key, ttl, serialized),
          this.timeout(this.operationTimeout),
        ]);
      } else {
        await Promise.race([
          this.redis.set(key, serialized),
          this.timeout(this.operationTimeout),
        ]);
      }
    } catch {
      // Fail silently
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      await Promise.race([
        this.redis.del(key),
        this.timeout(this.operationTimeout),
      ]);
    } catch {
      // Fail silently
    }
  }

  /**
   * Borra todas las claves que coinciden con un patrón
   * Usa SCAN en lugar de KEYS para evitar bloquear Redis en bases de datos grandes
   * Ejemplo: delPattern('albums:recent:*')
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      let cursor = '0';
      const keysToDelete: string[] = [];

      // Usar SCAN para iterar de forma non-blocking
      do {
        const [nextCursor, keys] = await Promise.race([
          this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100),
          this.timeout<[string, string[]]>(this.operationTimeout),
        ]) as [string, string[]];
        cursor = nextCursor;
        keysToDelete.push(...keys);
      } while (cursor !== '0');

      // Borrar en lotes para evitar comandos muy grandes
      if (keysToDelete.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < keysToDelete.length; i += batchSize) {
          const batch = keysToDelete.slice(i, i + batchSize);
          await this.redis.del(...batch);
        }
      }
    } catch {
      // Fail silently
    }
  }

  async clear(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis.flushdb();
    } catch {
      // Fail silently
    }
  }

  private timeout<T>(ms: number): Promise<T> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis operation timeout')), ms)
    );
  }
}
