import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Redis } from 'ioredis';
import { cacheConfig } from '@config/cache.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redis!: Redis;

  constructor(
    @InjectPinoLogger(RedisService.name)
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit() {
    this.redis = new Redis({
      host: cacheConfig.redis_host,
      port: cacheConfig.redis_port,
      password: cacheConfig.redis_password,
    });

    this.redis.on('connect', () => {
      this.logger.info({
        host: cacheConfig.redis_host,
        port: cacheConfig.redis_port,
      }, 'Redis connected');
    });

    this.redis.on('error', (err) => {
      this.logger.error({
        error: err,
        host: cacheConfig.redis_host,
        port: cacheConfig.redis_port,
      }, 'Redis error');
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async get<T = any>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Borra todas las claves que coinciden con un patrón
   * Usa SCAN en lugar de KEYS para evitar bloquear Redis en bases de datos grandes
   * Ejemplo: delPattern('albums:recent:*')
   */
  async delPattern(pattern: string): Promise<void> {
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
  }

  async clear(): Promise<void> {
    await this.redis.flushdb();
  }
}