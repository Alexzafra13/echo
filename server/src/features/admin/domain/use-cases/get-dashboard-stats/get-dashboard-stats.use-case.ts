import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { ConfigService } from '@nestjs/config';
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
} from './get-dashboard-stats.dto';

@Injectable()
export class GetDashboardStatsUseCase {
  private readonly logger = new Logger(GetDashboardStatsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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
      ] = await Promise.all([
        this.getLibraryStats(),
        this.getStorageBreakdown(),
        this.getSystemHealth(),
        this.getEnrichmentStats(),
        this.getActivityStats(),
        this.getScanStats(),
        this.getActiveAlerts(),
      ]);

      return {
        libraryStats,
        storageBreakdown,
        systemHealth,
        enrichmentStats,
        activityStats,
        scanStats,
        activeAlerts,
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
      totalTracks,
      totalAlbums,
      totalArtists,
      totalGenres,
      durationSum,
      storageSum,
      tracksAddedToday,
      albumsAddedToday,
      artistsAddedToday,
    ] = await Promise.all([
      this.prisma.track.count(),
      this.prisma.album.count(),
      this.prisma.artist.count(),
      this.prisma.genre.count(),
      this.prisma.track.aggregate({
        _sum: { duration: true },
      }),
      this.prisma.track.aggregate({
        _sum: { size: true },
      }),
      this.prisma.track.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.album.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.artist.count({
        where: { createdAt: { gte: today } },
      }),
    ]);

    return {
      totalTracks,
      totalAlbums,
      totalArtists,
      totalGenres,
      totalDuration: durationSum._sum.duration || 0,
      totalStorage: Number(storageSum._sum.size || 0),
      tracksAddedToday,
      albumsAddedToday,
      artistsAddedToday,
    };
  }

  private async getStorageBreakdown(): Promise<StorageBreakdown> {
    const [musicSize, metadataSize, avatarSize] = await Promise.all([
      // Music files size
      this.prisma.track.aggregate({
        _sum: { size: true },
      }),
      // Metadata storage (artist images)
      this.prisma.artist.aggregate({
        _sum: { metadataStorageSize: true },
      }),
      // User avatars size
      this.prisma.user.aggregate({
        _sum: { avatarSize: true },
      }),
    ]);

    const music = Number(musicSize._sum.size || 0);
    const metadata = Number(metadataSize._sum.metadataStorageSize || 0);
    const avatars = Number(avatarSize._sum.avatarSize || 0);

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
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseHealth = 'down';
    }

    // Redis health - check if Redis is configured
    let redisHealth: 'healthy' | 'degraded' | 'down' = 'healthy';
    const redisEnabled = this.config.get<string>('ENABLE_CACHE', 'true') === 'true';
    if (!redisEnabled) {
      redisHealth = 'down';
    }

    // Scanner status - check latest scan
    const latestScan = await this.prisma.libraryScan.findFirst({
      orderBy: { startedAt: 'desc' },
    });

    let scannerStatus: 'idle' | 'running' | 'error' = 'idle';
    if (latestScan) {
      if (latestScan.status === 'running' || latestScan.status === 'in_progress') {
        scannerStatus = 'running';
      } else if (latestScan.status === 'failed' || latestScan.status === 'error') {
        scannerStatus = 'error';
      }
    }

    // Metadata APIs - check if API keys are configured
    const lastfmKey = this.config.get<string>('LASTFM_API_KEY');
    const fanartKey = this.config.get<string>('FANART_API_KEY');

    // Storage health - check if storage is approaching limits
    const storageBreakdown = await this.getStorageBreakdown();
    const maxStorageMB = 500; // Default from settings
    const maxStorageBytes = maxStorageMB * 1024 * 1024;
    let storageHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (storageBreakdown.total > maxStorageBytes * 0.9) {
      storageHealth = 'critical';
    } else if (storageBreakdown.total > maxStorageBytes * 0.75) {
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
      this.prisma.enrichmentLog.findMany({
        where: { createdAt: { gte: today } },
        select: { status: true, provider: true },
      }),
      this.prisma.enrichmentLog.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { status: true, provider: true },
      }),
      this.prisma.enrichmentLog.findMany({
        where: { createdAt: { gte: monthAgo } },
        select: { status: true, provider: true },
      }),
      this.prisma.enrichmentLog.findMany({
        select: { status: true, provider: true },
      }),
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

    const [totalUsers, activeUsersLast24h, activeUsersLast7d] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({
        where: {
          isActive: true,
          lastAccessAt: { gte: last24h },
        },
      }),
      this.prisma.user.count({
        where: {
          isActive: true,
          lastAccessAt: { gte: last7d },
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsersLast24h,
      activeUsersLast7d,
    };
  }

  private async getScanStats(): Promise<ScanStats> {
    const latestScan = await this.prisma.libraryScan.findFirst({
      orderBy: { startedAt: 'desc' },
    });

    const currentScan = await this.prisma.libraryScan.findFirst({
      where: {
        status: { in: ['running', 'in_progress'] },
      },
      orderBy: { startedAt: 'desc' },
    });

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
    const [orphanedArtistImages, orphanedAlbumCovers, pendingConflicts, recentScanErrors] = await Promise.all([
      this.prisma.customArtistImage.count({
        where: { isActive: false },
      }),
      this.prisma.customAlbumCover.count({
        where: { isActive: false },
      }),
      this.prisma.metadataConflict.count({
        where: { status: 'pending' },
      }),
      this.prisma.libraryScan.count({
        where: {
          status: { in: ['failed', 'error'] },
          startedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    const storageBreakdown = await this.getStorageBreakdown();
    const maxStorageMB = 500;
    const maxStorageBytes = maxStorageMB * 1024 * 1024;
    const storageWarning = storageBreakdown.total > maxStorageBytes * 0.75;

    return {
      orphanedFiles: orphanedArtistImages + orphanedAlbumCovers,
      pendingConflicts,
      storageWarning,
      scanErrors: recentScanErrors,
    };
  }
}
