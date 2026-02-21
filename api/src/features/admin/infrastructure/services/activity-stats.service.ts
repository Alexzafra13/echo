import { Injectable } from '@nestjs/common';
import { count, gte, lt, and, eq, desc, inArray, isNotNull } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { users, libraryScans, enrichmentLogs } from '@infrastructure/database/schema';
import {
  ActivityStats,
  ActivityTimelineDay,
  RecentActivity,
} from '../../domain/use-cases/get-dashboard-stats/get-dashboard-stats.dto';

@Injectable()
export class ActivityStatsService {
  private readonly CACHE_TTL_SHORT = 120;
  private readonly CACHE_TTL_RECENT = 60;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly cache: RedisService
  ) {}

  async getStats(): Promise<ActivityStats> {
    const cacheKey = 'dashboard:activity-stats';
    const cached = await this.cache.get<ActivityStats>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const last24h = new Date(now);
    last24h.setHours(last24h.getHours() - 24);

    const last7d = new Date(now);
    last7d.setDate(last7d.getDate() - 7);

    const [totalUsersResult, activeUsersLast24hResult, activeUsersLast7dResult] = await Promise.all(
      [
        this.drizzle.db.select({ count: count() }).from(users).where(eq(users.isActive, true)),
        this.drizzle.db
          .select({ count: count() })
          .from(users)
          .where(and(eq(users.isActive, true), gte(users.lastAccessAt, last24h))),
        this.drizzle.db
          .select({ count: count() })
          .from(users)
          .where(and(eq(users.isActive, true), gte(users.lastAccessAt, last7d))),
      ]
    );

    const stats: ActivityStats = {
      totalUsers: totalUsersResult[0]?.count ?? 0,
      activeUsersLast24h: activeUsersLast24hResult[0]?.count ?? 0,
      activeUsersLast7d: activeUsersLast7dResult[0]?.count ?? 0,
    };

    await this.cache.set(cacheKey, stats, this.CACHE_TTL_SHORT);
    return stats;
  }

  async getTimeline(): Promise<ActivityTimelineDay[]> {
    const cacheKey = 'dashboard:activity-timeline';
    const cached = await this.cache.get<ActivityTimelineDay[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const timeline: ActivityTimelineDay[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [scansResult, enrichmentsResult, errorsResult] = await Promise.all([
        this.drizzle.db
          .select({ count: count() })
          .from(libraryScans)
          .where(and(gte(libraryScans.startedAt, date), lt(libraryScans.startedAt, nextDate))),
        this.drizzle.db
          .select({ count: count() })
          .from(enrichmentLogs)
          .where(
            and(
              gte(enrichmentLogs.createdAt, date),
              lt(enrichmentLogs.createdAt, nextDate),
              inArray(enrichmentLogs.status, ['success', 'completed'])
            )
          ),
        this.drizzle.db
          .select({ count: count() })
          .from(enrichmentLogs)
          .where(
            and(
              gte(enrichmentLogs.createdAt, date),
              lt(enrichmentLogs.createdAt, nextDate),
              inArray(enrichmentLogs.status, ['failed', 'error'])
            )
          ),
      ]);

      timeline.push({
        date: date.toISOString().split('T')[0],
        scans: scansResult[0]?.count ?? 0,
        enrichments: enrichmentsResult[0]?.count ?? 0,
        errors: errorsResult[0]?.count ?? 0,
      });
    }

    await this.cache.set(cacheKey, timeline, this.CACHE_TTL_SHORT);
    return timeline;
  }

  async getRecentActivities(): Promise<RecentActivity[]> {
    const cacheKey = 'dashboard:recent-activities';
    const cached = await this.cache.get<RecentActivity[]>(cacheKey);
    if (cached) {
      return cached.map((a: RecentActivity) => ({ ...a, timestamp: new Date(a.timestamp) }));
    }

    const activities: RecentActivity[] = [];

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
        status:
          scan.status === 'completed' ? 'success' : scan.status === 'failed' ? 'error' : 'warning',
      });
    });

    const recentEnrichments = await this.drizzle.db
      .select()
      .from(enrichmentLogs)
      .where(inArray(enrichmentLogs.status, ['success', 'completed', 'failed', 'error']))
      .orderBy(desc(enrichmentLogs.createdAt))
      .limit(5);

    recentEnrichments.forEach((enrichment) => {
      const entityTypeLabel = enrichment.entityType === 'album' ? 'Álbum' : 'Artista';
      const metadataTypeLabel = this.getMetadataTypeLabel(enrichment.metadataType);

      activities.push({
        id: enrichment.id,
        type: 'enrichment',
        action: `${entityTypeLabel} enriquecido`,
        details: `${metadataTypeLabel} de "${enrichment.entityName}" desde ${enrichment.provider}`,
        timestamp: enrichment.createdAt,
        status:
          enrichment.status === 'success' || enrichment.status === 'completed'
            ? 'success'
            : 'error',
      });
    });

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

    const result = activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    await this.cache.set(cacheKey, result, this.CACHE_TTL_RECENT);
    return result;
  }

  private getMetadataTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      cover: 'portada',
      avatar: 'avatar',
      banner: 'banner',
    };
    return labels[type] || 'metadata';
  }
}
