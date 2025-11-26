import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq, count, sum, sql, gte, lt, inArray, and, desc, isNotNull } from 'drizzle-orm';
import {
  tracks,
  albums,
  artists,
  genres,
  users,
  libraryScans,
  enrichmentLogs,
  customArtistImages,
  customAlbumCovers,
  metadataConflicts,
} from '@infrastructure/database/schema';
import { HealthCheckService } from '@features/health/health-check.service';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import {
  GetDashboardStatsInput,
  GetDashboardStatsOutput,
  LibraryStats,
  StorageBreakdown,
  SystemHealth,
  EnrichmentStats,
  ActivityStats,
  ScanStats,
  ActiveAlerts,
  ActivityTimelineDay,
  RecentActivity,
} from './get-dashboard-stats.dto';

@Injectable()
export class GetDashboardStatsUseCase {
  private readonly logger = new Logger(GetDashboardStatsUseCase.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly healthCheck: HealthCheckService,
    private readonly settingsService: SettingsService,
  ) {}

  async execute(input: GetDashboardStatsInput): Promise<GetDashboardStatsOutput> {
    try {
      // Get all stats in parallel for performance
      const [
        libraryStats,
        storageBreakdown,
        systemHealth,
        enrichmentStats,
        activityStats,
        scanStats,
        activeAlerts,
        activityTimeline,
        recentActivities,
      ] = await Promise.all([
        this.getLibraryStats(),
        this.getStorageBreakdown(),
        this.getSystemHealth(),
        this.getEnrichmentStats(),
        this.getActivityStats(),
        this.getScanStats(),
        this.getActiveAlerts(),
        this.getActivityTimeline(),
        this.getRecentActivities(),
      ]);

      return {
        libraryStats,
        storageBreakdown,
        systemHealth,
        enrichmentStats,
        activityStats,
        scanStats,
        activeAlerts,
        activityTimeline,
        recentActivities,
      };
    } catch (error) {
      this.logger.error(`Error getting dashboard stats: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  private async getLibraryStats(): Promise<LibraryStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalTracksResult,
      totalAlbumsResult,
      totalArtistsResult,
      totalGenresResult,
      durationSumResult,
      storageSumResult,
      tracksAddedTodayResult,
      albumsAddedTodayResult,
      artistsAddedTodayResult,
    ] = await Promise.all([
      this.drizzle.db.select({ count: count() }).from(tracks),
      this.drizzle.db.select({ count: count() }).from(albums),
      this.drizzle.db.select({ count: count() }).from(artists),
      this.drizzle.db.select({ count: count() }).from(genres),
      this.drizzle.db.select({ sum: sum(tracks.duration) }).from(tracks),
      this.drizzle.db.select({ sum: sum(tracks.size) }).from(tracks),
      this.drizzle.db.select({ count: count() }).from(tracks).where(gte(tracks.createdAt, today)),
      this.drizzle.db.select({ count: count() }).from(albums).where(gte(albums.createdAt, today)),
      this.drizzle.db.select({ count: count() }).from(artists).where(gte(artists.createdAt, today)),
    ]);

    return {
      totalTracks: totalTracksResult[0]?.count ?? 0,
      totalAlbums: totalAlbumsResult[0]?.count ?? 0,
      totalArtists: totalArtistsResult[0]?.count ?? 0,
      totalGenres: totalGenresResult[0]?.count ?? 0,
      totalDuration: Number(durationSumResult[0]?.sum || 0),
      totalStorage: Number(storageSumResult[0]?.sum || 0),
      tracksAddedToday: tracksAddedTodayResult[0]?.count ?? 0,
      albumsAddedToday: albumsAddedTodayResult[0]?.count ?? 0,
      artistsAddedToday: artistsAddedTodayResult[0]?.count ?? 0,
    };
  }

  private async getStorageBreakdown(): Promise<StorageBreakdown> {
    const [musicSizeResult, metadataSizeResult, avatarSizeResult] = await Promise.all([
      // Music files size
      this.drizzle.db.select({ sum: sum(tracks.size) }).from(tracks),
      // Metadata storage (artist images)
      this.drizzle.db.select({ sum: sum(artists.metadataStorageSize) }).from(artists),
      // User avatars size
      this.drizzle.db.select({ sum: sum(users.avatarSize) }).from(users),
    ]);

    const music = Number(musicSizeResult[0]?.sum || 0);
    const metadata = Number(metadataSizeResult[0]?.sum || 0);
    const avatars = Number(avatarSizeResult[0]?.sum || 0);

    return {
      music,
      metadata,
      avatars,
      total: music + metadata + avatars,
    };
  }

  private async getSystemHealth(): Promise<SystemHealth> {
    // Database health - try a simple query
    let databaseHealth: 'healthy' | 'degraded' | 'down' = 'healthy';
    try {
      await this.drizzle.db.execute(sql`SELECT 1`);
    } catch {
      databaseHealth = 'down';
    }

    // Redis health - actually check if Redis is connected
    let redisHealth: 'healthy' | 'degraded' | 'down' = 'healthy';
    try {
      const healthCheck = await this.healthCheck.check();
      if (healthCheck.services.cache === 'error') {
        redisHealth = 'down';
      }
    } catch (error) {
      // Health check throws if services are down
      redisHealth = 'down';
    }

    // Scanner status - check latest scan
    const latestScanResult = await this.drizzle.db
      .select()
      .from(libraryScans)
      .orderBy(desc(libraryScans.startedAt))
      .limit(1);
    const latestScan = latestScanResult[0] ?? null;

    let scannerStatus: 'idle' | 'running' | 'error' = 'idle';
    if (latestScan) {
      if (latestScan.status === 'running' || latestScan.status === 'in_progress') {
        scannerStatus = 'running';
      } else if (latestScan.status === 'failed' || latestScan.status === 'error') {
        scannerStatus = 'error';
      }
    }

    // Metadata APIs - check if API keys are configured in database
    // Check both possible key formats (frontend saves as metadata.*, legacy as api.*)
    const lastfmKey = await this.settingsService.getString('metadata.lastfm.api_key', '') ||
                      await this.settingsService.getString('api.lastfm.api_key', '');
    const fanartKey = await this.settingsService.getString('metadata.fanart.api_key', '') ||
                      await this.settingsService.getString('api.fanart.api_key', '');

    // Storage health - check if storage is approaching limits
    // Only count metadata + avatars (not music files)
    const storageBreakdown = await this.getStorageBreakdown();
    const maxStorageMB = 5120; // 5GB default limit (configurable in settings)
    const maxStorageBytes = maxStorageMB * 1024 * 1024;
    const managedStorageBytes = storageBreakdown.metadata + storageBreakdown.avatars; // Exclude music
    let storageHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (managedStorageBytes > maxStorageBytes * 0.9) {
      storageHealth = 'critical';
    } else if (managedStorageBytes > maxStorageBytes * 0.75) {
      storageHealth = 'warning';
    }

    return {
      database: databaseHealth,
      redis: redisHealth,
      scanner: scannerStatus,
      metadataApis: {
        lastfm: lastfmKey ? 'healthy' : 'down',
        fanart: fanartKey ? 'healthy' : 'down',
        musicbrainz: 'healthy', // MusicBrainz doesn't require API key
      },
      storage: storageHealth,
    };
  }

  private async getEnrichmentStats(): Promise<EnrichmentStats> {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [todayLogs, weekLogs, monthLogs, allTimeLogs] = await Promise.all([
      this.drizzle.db
        .select({ status: enrichmentLogs.status, provider: enrichmentLogs.provider })
        .from(enrichmentLogs)
        .where(gte(enrichmentLogs.createdAt, today)),
      this.drizzle.db
        .select({ status: enrichmentLogs.status, provider: enrichmentLogs.provider })
        .from(enrichmentLogs)
        .where(gte(enrichmentLogs.createdAt, weekAgo)),
      this.drizzle.db
        .select({ status: enrichmentLogs.status, provider: enrichmentLogs.provider })
        .from(enrichmentLogs)
        .where(gte(enrichmentLogs.createdAt, monthAgo)),
      this.drizzle.db
        .select({ status: enrichmentLogs.status, provider: enrichmentLogs.provider })
        .from(enrichmentLogs),
    ]);

    const calculateStats = (logs: Array<{ status: string; provider: string }>) => {
      const total = logs.length;
      const successful = logs.filter((log) => log.status === 'success' || log.status === 'completed').length;
      const failed = logs.filter((log) => log.status === 'failed' || log.status === 'error').length;
      const byProvider: Record<string, number> = {};

      logs.forEach((log) => {
        byProvider[log.provider] = (byProvider[log.provider] || 0) + 1;
      });

      return { total, successful, failed, byProvider };
    };

    return {
      today: calculateStats(todayLogs),
      week: calculateStats(weekLogs),
      month: calculateStats(monthLogs),
      allTime: calculateStats(allTimeLogs),
    };
  }

  private async getActivityStats(): Promise<ActivityStats> {
    const now = new Date();
    const last24h = new Date(now);
    last24h.setHours(last24h.getHours() - 24);

    const last7d = new Date(now);
    last7d.setDate(last7d.getDate() - 7);

    const [totalUsersResult, activeUsersLast24hResult, activeUsersLast7dResult] = await Promise.all([
      this.drizzle.db
        .select({ count: count() })
        .from(users)
        .where(eq(users.isActive, true)),
      this.drizzle.db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.isActive, true), gte(users.lastAccessAt, last24h))),
      this.drizzle.db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.isActive, true), gte(users.lastAccessAt, last7d))),
    ]);

    return {
      totalUsers: totalUsersResult[0]?.count ?? 0,
      activeUsersLast24h: activeUsersLast24hResult[0]?.count ?? 0,
      activeUsersLast7d: activeUsersLast7dResult[0]?.count ?? 0,
    };
  }

  private async getScanStats(): Promise<ScanStats> {
    const latestScanResult = await this.drizzle.db
      .select()
      .from(libraryScans)
      .orderBy(desc(libraryScans.startedAt))
      .limit(1);
    const latestScan = latestScanResult[0] ?? null;

    const currentScanResult = await this.drizzle.db
      .select()
      .from(libraryScans)
      .where(inArray(libraryScans.status, ['running', 'in_progress']))
      .orderBy(desc(libraryScans.startedAt))
      .limit(1);
    const currentScan = currentScanResult[0] ?? null;

    return {
      lastScan: {
        startedAt: latestScan?.startedAt || null,
        finishedAt: latestScan?.finishedAt || null,
        status: latestScan?.status || null,
        tracksAdded: latestScan?.tracksAdded || 0,
        tracksUpdated: latestScan?.tracksUpdated || 0,
        tracksDeleted: latestScan?.tracksDeleted || 0,
      },
      currentScan: {
        isRunning: !!currentScan,
        startedAt: currentScan?.startedAt || null,
        progress: 0, // TODO: Implement progress tracking in scanner
      },
    };
  }

  private async getActiveAlerts(): Promise<ActiveAlerts> {
    // Get orphaned files count (custom images/covers without active flag)
    const [
      orphanedArtistImagesResult,
      orphanedAlbumCoversResult,
      pendingConflictsResult,
      recentScanErrorsResult,
    ] = await Promise.all([
      this.drizzle.db
        .select({ count: count() })
        .from(customArtistImages)
        .where(eq(customArtistImages.isActive, false)),
      this.drizzle.db
        .select({ count: count() })
        .from(customAlbumCovers)
        .where(eq(customAlbumCovers.isActive, false)),
      this.drizzle.db
        .select({ count: count() })
        .from(metadataConflicts)
        .where(eq(metadataConflicts.status, 'pending')),
      this.drizzle.db
        .select({ count: count() })
        .from(libraryScans)
        .where(
          and(
            inArray(libraryScans.status, ['failed', 'error']),
            gte(libraryScans.startedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
          ),
        ),
    ]);

    const orphanedArtistImages = orphanedArtistImagesResult[0]?.count ?? 0;
    const orphanedAlbumCovers = orphanedAlbumCoversResult[0]?.count ?? 0;
    const pendingConflicts = pendingConflictsResult[0]?.count ?? 0;
    const recentScanErrors = recentScanErrorsResult[0]?.count ?? 0;

    const storageBreakdown = await this.getStorageBreakdown();
    const maxStorageMB = 5120; // 5GB default limit
    const maxStorageBytes = maxStorageMB * 1024 * 1024;
    const managedStorageBytes = storageBreakdown.metadata + storageBreakdown.avatars; // Exclude music
    const storageWarning = managedStorageBytes > maxStorageBytes * 0.75;

    const currentMB = Math.round(managedStorageBytes / (1024 * 1024));
    const percentUsed = Math.round((managedStorageBytes / maxStorageBytes) * 100);

    return {
      orphanedFiles: orphanedArtistImages + orphanedAlbumCovers,
      pendingConflicts,
      storageWarning,
      storageDetails: storageWarning ? {
        currentMB,
        limitMB: maxStorageMB,
        percentUsed,
      } : undefined,
      scanErrors: recentScanErrors,
    };
  }

  private async getActivityTimeline(): Promise<ActivityTimelineDay[]> {
    const timeline: ActivityTimelineDay[] = [];
    const now = new Date();

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      // Get scans for this day
      const scansResult = await this.drizzle.db
        .select({ count: count() })
        .from(libraryScans)
        .where(and(gte(libraryScans.startedAt, date), lt(libraryScans.startedAt, nextDate)));
      const scans = scansResult[0]?.count ?? 0;

      // Get enrichments for this day
      const enrichmentsResult = await this.drizzle.db
        .select({ count: count() })
        .from(enrichmentLogs)
        .where(
          and(
            gte(enrichmentLogs.createdAt, date),
            lt(enrichmentLogs.createdAt, nextDate),
            inArray(enrichmentLogs.status, ['success', 'completed']),
          ),
        );
      const enrichments = enrichmentsResult[0]?.count ?? 0;

      // Get errors for this day
      const errorsResult = await this.drizzle.db
        .select({ count: count() })
        .from(enrichmentLogs)
        .where(
          and(
            gte(enrichmentLogs.createdAt, date),
            lt(enrichmentLogs.createdAt, nextDate),
            inArray(enrichmentLogs.status, ['failed', 'error']),
          ),
        );
      const errors = errorsResult[0]?.count ?? 0;

      timeline.push({
        date: date.toISOString().split('T')[0], // YYYY-MM-DD
        scans,
        enrichments,
        errors,
      });
    }

    return timeline;
  }

  private async getRecentActivities(): Promise<RecentActivity[]> {
    const activities: RecentActivity[] = [];

    // Get recent scans (last 3)
    const recentScans = await this.drizzle.db
      .select()
      .from(libraryScans)
      .orderBy(desc(libraryScans.startedAt))
      .limit(3);

    recentScans.forEach((scan) => {
      activities.push({
        id: scan.id,
        type: 'scan',
        action: 'Escaneo de librería',
        details: `${scan.tracksAdded} agregadas, ${scan.tracksUpdated} actualizadas, ${scan.tracksDeleted} eliminadas`,
        timestamp: scan.startedAt,
        status: scan.status === 'completed' ? 'success' : scan.status === 'failed' ? 'error' : 'warning',
      });
    });

    // Get recent enrichments (last 5)
    const recentEnrichments = await this.drizzle.db
      .select()
      .from(enrichmentLogs)
      .where(inArray(enrichmentLogs.status, ['success', 'completed', 'failed', 'error']))
      .orderBy(desc(enrichmentLogs.createdAt))
      .limit(5);

    recentEnrichments.forEach((enrichment) => {
      const entityTypeLabel = enrichment.entityType === 'album' ? 'Álbum' : 'Artista';
      const metadataTypeLabel =
        enrichment.metadataType === 'cover'
          ? 'portada'
          : enrichment.metadataType === 'avatar'
            ? 'avatar'
            : enrichment.metadataType === 'banner'
              ? 'banner'
              : 'metadata';

      activities.push({
        id: enrichment.id,
        type: 'enrichment',
        action: `${entityTypeLabel} enriquecido`,
        details: `${metadataTypeLabel} de "${enrichment.entityName}" desde ${enrichment.provider}`,
        timestamp: enrichment.createdAt,
        status: enrichment.status === 'success' || enrichment.status === 'completed' ? 'success' : 'error',
      });
    });

    // Get recent user logins (last 2)
    const recentLogins = await this.drizzle.db
      .select()
      .from(users)
      .where(isNotNull(users.lastLoginAt))
      .orderBy(desc(users.lastLoginAt))
      .limit(2);

    recentLogins.forEach((user) => {
      if (user.lastLoginAt) {
        activities.push({
          id: `login-${user.id}`,
          type: 'user',
          action: 'Inicio de sesión',
          details: `Usuario ${user.username}`,
          timestamp: user.lastLoginAt,
          status: 'success',
        });
      }
    });

    // Sort all activities by timestamp and return last 10
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
  }
}
