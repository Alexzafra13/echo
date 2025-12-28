import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import * as os from 'os';

export interface HealthCheckResult {
  status: 'ok' | 'error' | 'degraded';
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
export class HealthCheckService {
  private startTime: number = Date.now();

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const timestamp = Date.now();
    const uptime = Math.floor((timestamp - this.startTime) / 1000);

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

    // Run checks in parallel
    const [dbResult, cacheResult] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    // Database is critical
    if (dbResult.status === 'rejected') {
      result.services.database = 'error';
      result.status = 'error';
      const errorMessage = dbResult.reason instanceof Error
        ? dbResult.reason.message
        : String(dbResult.reason);
      result.error = `Database: ${errorMessage}`;
    }

    // Cache is non-critical (degraded mode)
    if (cacheResult.status === 'rejected') {
      result.services.cache = 'error';
      if (result.status === 'ok') {
        result.status = 'degraded';
      }
      const errorMessage = cacheResult.reason instanceof Error
        ? cacheResult.reason.message
        : String(cacheResult.reason);
      result.error = result.error
        ? `${result.error}; Cache: ${errorMessage}`
        : `Cache: ${errorMessage}`;
    }

    result.system = this.getSystemMetrics();

    if (result.services.database === 'error') {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }

  private getSystemMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      memory: {
        total: Math.round(totalMemory / 1024 / 1024),
        free: Math.round(freeMemory / 1024 / 1024),
        used: Math.round(usedMemory / 1024 / 1024),
        usagePercent: Math.round((usedMemory / totalMemory) * 100),
      },
      cpu: {
        loadAverage: os.loadavg(),
      },
    };
  }

  private async checkDatabase(): Promise<void> {
    await this.drizzle.db.execute(sql`SELECT 1`);
  }

  private async checkRedis(): Promise<void> {
    const isAlive = await this.redis.ping();
    if (!isAlive) {
      throw new Error('Redis ping failed');
    }
  }
}
