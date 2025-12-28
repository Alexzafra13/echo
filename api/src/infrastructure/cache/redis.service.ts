import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Redis } from 'ioredis';
import { cacheConfig } from '@config/cache.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redis!: Redis;
  private isConnected = false;

  constructor(
    @InjectPinoLogger(RedisService.name)
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit() {
    this.redis = new Redis({
      host: cacheConfig.redis_host,
      port: cacheConfig.redis_port,
      password: cacheConfig.redis_password,
      // Production-ready settings
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 10) {
          this.logger.error('Redis max retries reached, giving up');
          return null; // Stop retrying
        }
        // Exponential backoff: 100ms, 200ms, 400ms... max 3s
        const delay = Math.min(times * 100, 3000);
        this.logger.warn({ attempt: times, delay }, 'Redis reconnecting...');
        return delay;
      },
      // Connection timeout
      connectTimeout: 10000,
      // Keep-alive
      keepAlive: 30000,
      // Enable offline queue (commands are queued when disconnected)
      enableOfflineQueue: true,
      // Lazy connect - don't block startup
      lazyConnect: false,
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      this.logger.info({
        host: cacheConfig.redis_host,
        port: cacheConfig.redis_port,
      }, 'Redis connected');
    });

    this.redis.on('ready', () => {
      this.logger.debug('Redis ready to accept commands');
    });

    this.redis.on('error', (err) => {
      this.logger.error({
        error: err.message,
        host: cacheConfig.redis_host,
        port: cacheConfig.redis_port,
      }, 'Redis error');
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      this.logger.info('Redis reconnecting...');
    });
  }

  /**
   * Check if Redis is connected
   */
  get connected(): boolean {
    return this.isConnected && this.redis?.status === 'ready';
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? (JSON.parse(data) as T) : null;
    } catch (error) {
      // Log but don't throw - cache failures shouldn't break the app
      this.logger.warn({ key, error: (error as Error).message }, 'Redis get failed');
      return null;
    }
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      // Log but don't throw - cache failures shouldn't break the app
      this.logger.warn({ key, error: (error as Error).message }, 'Redis set failed');
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn({ key, error: (error as Error).message }, 'Redis del failed');
    }
  }

  /**
   * Borra todas las claves que coinciden con un patrón
   * Usa SCAN en lugar de KEYS para evitar bloquear Redis en bases de datos grandes
   * Ejemplo: delPattern('albums:recent:*')
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      const keysToDelete: string[] = [];

      // Usar SCAN para iterar de forma non-blocking
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
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
    } catch (error) {
      this.logger.warn({ pattern, error: (error as Error).message }, 'Redis delPattern failed');
    }
  }

  async clear(): Promise<void> {
    await this.redis.flushdb();
  }

  /**
   * Ping Redis to check connection health
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
