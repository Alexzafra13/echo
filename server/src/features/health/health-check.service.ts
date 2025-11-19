import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import Redis from 'ioredis';
import { cacheConfig } from '@/config/cache.config';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: number;
  uptime: number;
  version: string;
  services: {
    database: 'ok' | 'error';
    cache: 'ok' | 'error';
  };
  error?: string;
}

@Injectable()
export class HealthCheckService {
  private redis: Redis;
  private startTime: number = Date.now();

  constructor(private readonly prisma: PrismaService) {
    // Initialize Redis client for health checks
    this.redis = new Redis({
      host: cacheConfig.redis_host,
      port: cacheConfig.redis_port,
      password: cacheConfig.redis_password,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't retry on health checks
      lazyConnect: true,
    });
  }

  async check(): Promise<HealthCheckResult> {
    const timestamp = Date.now();
    const uptime = Math.floor((timestamp - this.startTime) / 1000); // in seconds

    const result: HealthCheckResult = {
      status: 'ok',
      timestamp,
      uptime,
      version: process.env.VERSION || '1.0.0',
      services: {
        database: 'ok',
        cache: 'ok',
      },
    };

    try {
      // Check database connection
      await this.checkDatabase();
    } catch (error) {
      result.services.database = 'error';
      result.status = 'error';
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = `Database: ${errorMessage}`;
    }

    try {
      // Check Redis connection
      await this.checkRedis();
    } catch (error) {
      result.services.cache = 'error';
      result.status = 'error';
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = result.error
        ? `${result.error}; Cache: ${errorMessage}`
        : `Cache: ${errorMessage}`;
    }

    // If any service is down, return 503
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }

  private async checkDatabase(): Promise<void> {
    // Simple query to check if database is responsive
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async checkRedis(): Promise<void> {
    try {
      // Ensure connection is established
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }

      // Simple ping to check if Redis is responsive
      const pong = await this.redis.ping();

      if (pong !== 'PONG') {
        throw new Error('Invalid Redis response');
      }
    } catch (error) {
      // Attempt to reconnect for next health check
      this.redis.disconnect();
      throw error;
    }
  }

  async onModuleDestroy() {
    // Clean up Redis connection
    await this.redis.quit();
  }
}
