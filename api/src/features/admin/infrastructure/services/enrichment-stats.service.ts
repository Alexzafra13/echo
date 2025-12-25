import { Injectable } from '@nestjs/common';
import { gte } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { enrichmentLogs } from '@infrastructure/database/schema';
import { EnrichmentStats } from '../../domain/use-cases/get-dashboard-stats/get-dashboard-stats.dto';

interface PeriodStats {
  total: number;
  successful: number;
  failed: number;
  byProvider: Record<string, number>;
}

@Injectable()
export class EnrichmentStatsService {
  private readonly CACHE_KEY = 'dashboard:enrichment-stats';
  private readonly CACHE_TTL = 120; // 2 minutes

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly cache: RedisService,
  ) {}

  async get(): Promise<EnrichmentStats> {
    const cached = await this.cache.get<EnrichmentStats>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }

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

    const stats: EnrichmentStats = {
      today: this.calculatePeriodStats(todayLogs),
      week: this.calculatePeriodStats(weekLogs),
      month: this.calculatePeriodStats(monthLogs),
      allTime: this.calculatePeriodStats(allTimeLogs),
    };

    await this.cache.set(this.CACHE_KEY, stats, this.CACHE_TTL);
    return stats;
  }

  private calculatePeriodStats(logs: Array<{ status: string; provider: string }>): PeriodStats {
    const total = logs.length;
    const successful = logs.filter(
      (log) => log.status === 'success' || log.status === 'completed',
    ).length;
    const failed = logs.filter(
      (log) => log.status === 'failed' || log.status === 'error',
    ).length;
    const byProvider: Record<string, number> = {};

    logs.forEach((log) => {
      byProvider[log.provider] = (byProvider[log.provider] || 0) + 1;
    });

    return { total, successful, failed, byProvider };
  }
}
