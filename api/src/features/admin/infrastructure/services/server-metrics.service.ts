import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as os from 'os';
import * as fs from 'fs/promises';
import { count, gt } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { ActiveStreamsTracker } from '@features/streaming/infrastructure/services/active-streams.tracker';
import { SettingsService } from '@infrastructure/settings';
import { streamTokens } from '@infrastructure/database/schema';
import type {
  ServerMetrics,
  ProcessMetrics,
  SystemMetricsInfo,
  StreamingMetrics,
  QueueMetricsItem,
  DatabaseMetrics,
} from '../../domain/use-cases/get-dashboard-stats/get-dashboard-stats.dto';

const STORAGE_WARNING_PERCENT = 85;
const STORAGE_CRITICAL_PERCENT = 95;
const LIBRARY_PATH_KEY = 'library.music.path';

@Injectable()
export class ServerMetricsService {
  constructor(
    @InjectPinoLogger(ServerMetricsService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly bullmq: BullmqService,
    private readonly activeStreamsTracker: ActiveStreamsTracker,
    private readonly settings: SettingsService
  ) {}

  async collect(): Promise<ServerMetrics> {
    const [streaming, queues, database, storage] = await Promise.all([
      this.getStreamingMetrics(),
      this.getQueueMetrics(),
      this.getDatabaseMetrics(),
      this.getStorageInfo(),
    ]);

    return {
      process: this.getProcessMetrics(),
      system: this.getSystemMetrics(storage),
      streaming,
      queues,
      database,
    };
  }

  private getProcessMetrics(): ProcessMetrics {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();

    return {
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
        externalMB: Math.round(mem.external / 1024 / 1024),
        heapUsagePercent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
      },
      cpuUsage: {
        userMicros: cpu.user,
        systemMicros: cpu.system,
      },
      nodeVersion: process.version,
      pid: process.pid,
    };
  }

  private getSystemMetrics(storage: SystemMetricsInfo['storage']): SystemMetricsInfo {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const cpus = os.cpus();

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpuCores: cpus.length,
      cpuModel: cpus[0]?.model ?? 'unknown',
      totalMemoryMB: Math.round(totalMemory / 1024 / 1024),
      freeMemoryMB: Math.round(freeMemory / 1024 / 1024),
      memoryUsagePercent: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
      loadAverage: os.loadavg(),
      uptimeSeconds: Math.floor(os.uptime()),
      storage,
    };
  }

  private async getStreamingMetrics(): Promise<StreamingMetrics> {
    let activeStreamTokens = 0;

    try {
      const result = await this.drizzle.db
        .select({ count: count() })
        .from(streamTokens)
        .where(gt(streamTokens.expiresAt, new Date()));
      activeStreamTokens = result[0]?.count ?? 0;
    } catch (error) {
      this.logger.debug({ err: error }, 'Failed to count stream tokens');
    }

    return {
      activeStreams: this.activeStreamsTracker.activeCount,
      totalStreamsServed: this.activeStreamsTracker.totalServed,
      activeStreamTokens,
    };
  }

  private async getQueueMetrics(): Promise<QueueMetricsItem[]> {
    try {
      return await this.bullmq.getQueueMetrics();
    } catch (error) {
      this.logger.debug({ err: error }, 'Failed to get queue metrics');
      return [];
    }
  }

  private getDatabaseMetrics(): DatabaseMetrics {
    const pool = this.drizzle.client;

    return {
      pool: {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingRequests: pool.waitingCount,
        maxConnections: pool.options.max ?? 10,
      },
    };
  }

  private async getStorageInfo(): Promise<SystemMetricsInfo['storage']> {
    try {
      const libraryPath = await this.settings.get<string>(LIBRARY_PATH_KEY);
      if (!libraryPath) return null;

      const stats = await fs.statfs(libraryPath);
      const blockSize = stats.bsize;
      const totalBytes = stats.blocks * blockSize;
      const freeBytes = stats.bfree * blockSize;
      const usedBytes = totalBytes - freeBytes;
      const usagePercent = Math.round((usedBytes / totalBytes) * 100);

      let status: 'ok' | 'warning' | 'critical' = 'ok';
      if (usagePercent >= STORAGE_CRITICAL_PERCENT) status = 'critical';
      else if (usagePercent >= STORAGE_WARNING_PERCENT) status = 'warning';

      return {
        libraryPath,
        totalGB: Math.round((totalBytes / 1024 / 1024 / 1024) * 10) / 10,
        freeGB: Math.round((freeBytes / 1024 / 1024 / 1024) * 10) / 10,
        usedGB: Math.round((usedBytes / 1024 / 1024 / 1024) * 10) / 10,
        usagePercent,
        status,
      };
    } catch {
      return null;
    }
  }
}
