import { Injectable } from '@nestjs/common';
import { count, eq, desc, inArray, isNotNull, sql } from 'drizzle-orm';
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

    // Single query with conditional counts (3 queries → 1)
    const result = await this.drizzle.db
      .select({
        totalUsers: count(),
        activeUsersLast24h: sql<number>`count(*) FILTER (WHERE ${users.lastAccessAt} >= ${last24h})`,
        activeUsersLast7d: sql<number>`count(*) FILTER (WHERE ${users.lastAccessAt} >= ${last7d})`,
      })
      .from(users)
      .where(eq(users.isActive, true));

    const stats: ActivityStats = {
      totalUsers: result[0]?.totalUsers ?? 0,
      activeUsersLast24h: result[0]?.activeUsersLast24h ?? 0,
      activeUsersLast7d: result[0]?.activeUsersLast7d ?? 0,
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

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 21 queries → 2 queries using GROUP BY DATE
    const [scanRows, enrichmentRows] = await Promise.all([
      this.drizzle.db.execute<{ day: string; scans: number }>(sql`
        SELECT DATE(started_at) AS day, COUNT(*)::int AS scans
        FROM library_scans
        WHERE started_at >= ${sevenDaysAgo}
        GROUP BY DATE(started_at)
      `),
      this.drizzle.db.execute<{ day: string; enrichments: number; errors: number }>(sql`
        SELECT DATE(created_at) AS day,
               COUNT(*) FILTER (WHERE status IN ('success', 'completed'))::int AS enrichments,
               COUNT(*) FILTER (WHERE status IN ('failed', 'error'))::int AS errors
        FROM enrichment_logs
        WHERE created_at >= ${sevenDaysAgo}
        GROUP BY DATE(created_at)
      `),
    ]);

    // Build lookup maps from query results
    const scanMap = new Map(scanRows.rows.map((r) => [r.day, r.scans]));
    const enrichMap = new Map(
      enrichmentRows.rows.map((r) => [r.day, { enrichments: r.enrichments, errors: r.errors }])
    );

    // Fill timeline for all 7 days (including days with no activity)
    const timeline: ActivityTimelineDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];

      timeline.push({
        date: dayStr,
        scans: scanMap.get(dayStr) ?? 0,
        enrichments: enrichMap.get(dayStr)?.enrichments ?? 0,
        errors: enrichMap.get(dayStr)?.errors ?? 0,
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
        action: 'scan',
        details: JSON.stringify({
          added: scan.tracksAdded,
          updated: scan.tracksUpdated,
          deleted: scan.tracksDeleted,
        }),
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
      activities.push({
        id: enrichment.id,
        type: 'enrichment',
        action: 'enrichment',
        details: JSON.stringify({
          entityType: enrichment.entityType,
          metadataType: enrichment.metadataType,
          entityName: enrichment.entityName,
          provider: enrichment.provider,
        }),
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
          action: 'login',
          details: JSON.stringify({ username: user.username }),
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
      favicon: 'favicon',
    };
    return labels[type] || 'metadata';
  }
}
