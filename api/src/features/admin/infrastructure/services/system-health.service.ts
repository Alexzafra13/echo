import { Injectable } from '@nestjs/common';
import { desc, sql } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { HealthCheckService } from '@features/health/health-check.service';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { libraryScans } from '@infrastructure/database/schema';
import { SystemHealth, StorageBreakdown } from '../../domain/use-cases/get-dashboard-stats/get-dashboard-stats.dto';

@Injectable()
export class SystemHealthService {
  private readonly MAX_STORAGE_MB = 5120;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly healthCheck: HealthCheckService,
    private readonly settingsService: SettingsService,
  ) {}

  async check(storageBreakdown: StorageBreakdown): Promise<SystemHealth> {
    const [databaseHealth, redisHealth, scannerStatus, metadataApis, storageHealth] =
      await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkScanner(),
        this.checkMetadataApis(),
        this.checkStorage(storageBreakdown),
      ]);

    return {
      database: databaseHealth,
      redis: redisHealth,
      scanner: scannerStatus,
      metadataApis,
      storage: storageHealth,
    };
  }

  private async checkDatabase(): Promise<'healthy' | 'degraded' | 'down'> {
    try {
      await this.drizzle.db.execute(sql`SELECT 1`);
      return 'healthy';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<'healthy' | 'degraded' | 'down'> {
    try {
      const healthCheck = await this.healthCheck.check();
      if (healthCheck.services.cache === 'error') {
        return 'down';
      }
      return 'healthy';
    } catch {
      return 'down';
    }
  }

  private async checkScanner(): Promise<'idle' | 'running' | 'error'> {
    const latestScanResult = await this.drizzle.db
      .select()
      .from(libraryScans)
      .orderBy(desc(libraryScans.startedAt))
      .limit(1);

    const latestScan = latestScanResult[0] ?? null;

    if (!latestScan) {
      return 'idle';
    }

    if (latestScan.status === 'running' || latestScan.status === 'in_progress') {
      return 'running';
    }

    if (latestScan.status === 'failed' || latestScan.status === 'error') {
      return 'error';
    }

    return 'idle';
  }

  private async checkMetadataApis(): Promise<{
    lastfm: 'healthy' | 'degraded' | 'down';
    fanart: 'healthy' | 'degraded' | 'down';
    musicbrainz: 'healthy' | 'degraded' | 'down';
  }> {
    const lastfmKey =
      (await this.settingsService.getString('metadata.lastfm.api_key', '')) ||
      (await this.settingsService.getString('api.lastfm.api_key', ''));

    const fanartKey =
      (await this.settingsService.getString('metadata.fanart.api_key', '')) ||
      (await this.settingsService.getString('api.fanart.api_key', ''));

    return {
      lastfm: lastfmKey ? 'healthy' : 'down',
      fanart: fanartKey ? 'healthy' : 'down',
      musicbrainz: 'healthy',
    };
  }

  private checkStorage(storageBreakdown: StorageBreakdown): 'healthy' | 'warning' | 'critical' {
    const maxStorageBytes = this.MAX_STORAGE_MB * 1024 * 1024;
    const managedStorageBytes = storageBreakdown.metadata + storageBreakdown.avatars;

    if (managedStorageBytes > maxStorageBytes * 0.9) {
      return 'critical';
    }

    if (managedStorageBytes > maxStorageBytes * 0.75) {
      return 'warning';
    }

    return 'healthy';
  }
}
