import { Injectable, HttpException, HttpStatus, OnModuleDestroy } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import Redis from 'ioredis';
import { cacheConfig } from '@config/cache.config';
import { InfrastructureError } from '@shared/errors';
import * as os from 'os';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: number;
  uptime: number;
  version: string;
  services: {
    database: 'ok' | 'error';
    cache: 'ok' | 'error';
  };
  system?: {
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
    cpu: {
      loadAverage: number[];
    };
  };
  error?: string;
}

@Injectable()
export class HealthCheckService implements OnModuleDestroy {
  private redis: Redis;
  private startTime: number = Date.now();

  constructor(private readonly drizzle: DrizzleService) {
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

    // Run all checks in parallel for faster response
    const [dbResult, cacheResult] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    // Process database check result
    if (dbResult.status === 'rejected') {
      result.services.database = 'error';
      result.status = 'error';
      const errorMessage = dbResult.reason instanceof Error
        ? dbResult.reason.message
        : String(dbResult.reason);
      result.error = `Database: ${errorMessage}`;
    }

    // Process cache check result
    if (cacheResult.status === 'rejected') {
      result.services.cache = 'error';
      result.status = 'error';
      const errorMessage = cacheResult.reason instanceof Error
        ? cacheResult.reason.message
        : String(cacheResult.reason);
      result.error = result.error
        ? `${result.error}; Cache: ${errorMessage}`
        : `Cache: ${errorMessage}`;
    }

    // Add system metrics (non-critical)
    result.system = this.getSystemMetrics();

    // If any service is down, return 503
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }

  /**
   * Get system metrics for monitoring
   */
  private getSystemMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const usagePercent = Math.round((usedMemory / totalMemory) * 100);

    return {
      memory: {
        total: Math.round(totalMemory / 1024 / 1024), // MB
        free: Math.round(freeMemory / 1024 / 1024), // MB
        used: Math.round(usedMemory / 1024 / 1024), // MB
        usagePercent,
      },
      cpu: {
        loadAverage: os.loadavg(),
      },
    };
  }

  private async checkDatabase(): Promise<void> {
    // Simple query to check if database is responsive
    await this.drizzle.db.execute(sql`SELECT 1`);
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
        throw new InfrastructureError('REDIS', 'Invalid ping response');
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
