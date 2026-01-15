import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { getVersion } from '@shared/utils/version.util';
import * as os from 'os';
import * as fs from 'fs/promises';

// Storage thresholds (percentage)
const STORAGE_WARNING_PERCENT = 85;
const STORAGE_CRITICAL_PERCENT = 95;

// Setting key for music library path
const LIBRARY_PATH_KEY = 'library.music.path';

export type ServiceStatus = 'ok' | 'warning' | 'critical' | 'error';

export interface StorageInfo {
  path: string;
  totalMB: number;
  freeMB: number;
  usedMB: number;
  usagePercent: number;
  status: ServiceStatus;
}

export interface HealthCheckResult {
  status: 'ok' | 'error' | 'degraded';
  timestamp: number;
  uptime: number;
  version: string;
  services: {
    database: ServiceStatus;
    cache: ServiceStatus;
    storage: ServiceStatus;
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
    storage?: StorageInfo;
  };
  error?: string;
}

@Injectable()
export class HealthCheckService {
  private startTime: number = Date.now();

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisService,
    private readonly settings: SettingsService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const timestamp = Date.now();
    const uptime = Math.floor((timestamp - this.startTime) / 1000);

    const result: HealthCheckResult = {
      status: 'ok',
      timestamp,
      uptime,
      version: getVersion(),
      services: {
        database: 'ok',
        cache: 'ok',
        storage: 'ok',
      },
    };

    // Run checks in parallel
    const [dbResult, cacheResult, storageResult] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);

    // Database is critical - app cannot function without it
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

    // Get system metrics (sync)
    const systemMetrics = this.getSystemMetrics();

    // Storage check - non-critical but important for monitoring
    if (storageResult.status === 'fulfilled' && storageResult.value) {
      const storageInfo = storageResult.value;
      result.services.storage = storageInfo.status;
      systemMetrics.storage = storageInfo;

      // Degrade status if storage is warning/critical
      if (storageInfo.status === 'critical' || storageInfo.status === 'warning') {
        if (result.status === 'ok') {
          result.status = 'degraded';
        }
        const storageMsg = `Storage: ${storageInfo.usagePercent}% used (${storageInfo.status})`;
        result.error = result.error ? `${result.error}; ${storageMsg}` : storageMsg;
      }
    } else if (storageResult.status === 'rejected') {
      // Storage check failed - not critical, just mark as error
      result.services.storage = 'error';
    }

    result.system = systemMetrics;

    // Only throw 503 if database is down (critical)
    if (result.services.database === 'error') {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }

  private getSystemMetrics(): {
    memory: { total: number; free: number; used: number; usagePercent: number };
    cpu: { loadAverage: number[] };
    storage?: StorageInfo;
  } {
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

  private async checkStorage(): Promise<StorageInfo | null> {
    // Get music library path from settings
    const libraryPath = await this.settings.get<string>(LIBRARY_PATH_KEY);

    if (!libraryPath) {
      // Library not configured yet (first run)
      return null;
    }

    try {
      // Use statfs to get disk space info (Node.js 18.15+)
      const stats = await fs.statfs(libraryPath);

      const blockSize = stats.bsize;
      const totalBytes = stats.blocks * blockSize;
      const freeBytes = stats.bfree * blockSize;
      const usedBytes = totalBytes - freeBytes;

      const totalMB = Math.round(totalBytes / 1024 / 1024);
      const freeMB = Math.round(freeBytes / 1024 / 1024);
      const usedMB = Math.round(usedBytes / 1024 / 1024);
      const usagePercent = Math.round((usedBytes / totalBytes) * 100);

      // Determine status based on thresholds
      let status: ServiceStatus = 'ok';
      if (usagePercent >= STORAGE_CRITICAL_PERCENT) {
        status = 'critical';
      } else if (usagePercent >= STORAGE_WARNING_PERCENT) {
        status = 'warning';
      }

      return {
        path: libraryPath,
        totalMB,
        freeMB,
        usedMB,
        usagePercent,
        status,
      };
    } catch {
      // Path doesn't exist or can't be accessed
      return null;
    }
  }
}
