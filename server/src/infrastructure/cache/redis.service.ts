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

  async get(key: string): Promise<any> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
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
   * Ejemplo: delPattern('albums:recent:*')
   */
  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async clear(): Promise<void> {
    await this.redis.flushdb();
  }
}