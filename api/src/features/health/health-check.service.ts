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

export interface LivenessResult {
  status: 'ok';
  timestamp: number;
}

export interface ReadinessResult {
  status: 'ok' | 'error';
  timestamp: number;
  services: {
    database: 'ok' | 'error';
    cache: 'ok' | 'error';
  };
}

@Injectable()
export class HealthCheckService {
  private startTime: number = Date.now();

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Full health check - includes all services and system metrics
   * Use for monitoring dashboards
   */
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

    // Process database check result - critical service
    if (dbResult.status === 'rejected') {
      result.services.database = 'error';
      result.status = 'error';
      const errorMessage = dbResult.reason instanceof Error
        ? dbResult.reason.message
        : String(dbResult.reason);
      result.error = `Database: ${errorMessage}`;
    }

    // Process cache check result - non-critical, can be degraded
    if (cacheResult.status === 'rejected') {
      result.services.cache = 'error';
      // Cache is non-critical - app can work without it (degraded mode)
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

    // Add system metrics (non-critical)
    result.system = this.getSystemMetrics();

    // Only throw 503 if database is down (critical)
    if (result.services.database === 'error') {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }

  /**
   * Liveness probe - is the process alive?
   * Used by Kubernetes to know if the pod should be restarted
   * Should be fast and always return 200 if the process is running
   */
  async liveness(): Promise<LivenessResult> {
    return {
      status: 'ok',
      timestamp: Date.now(),
    };
  }

  /**
   * Readiness probe - can the service handle requests?
   * Used by Kubernetes to know if the pod should receive traffic
   * Checks critical dependencies (database) but not non-critical ones (cache)
   */
  async readiness(): Promise<ReadinessResult> {
    const timestamp = Date.now();

    const result: ReadinessResult = {
      status: 'ok',
      timestamp,
      services: {
        database: 'ok',
        cache: 'ok',
      },
    };

    // Check database - critical for readiness
    try {
      await this.checkDatabase();
    } catch {
      result.services.database = 'error';
      result.status = 'error';
    }

    // Check cache - informational only, doesn't affect readiness
    try {
      await this.checkRedis();
    } catch {
      result.services.cache = 'error';
      // Don't change status - cache is not critical
    }

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
    const isAlive = await this.redis.ping();
    if (!isAlive) {
      throw new Error('Redis ping failed');
    }
  }
}
