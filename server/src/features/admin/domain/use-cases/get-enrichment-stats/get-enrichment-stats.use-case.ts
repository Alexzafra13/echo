import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { enrichmentLogs } from '@infrastructure/database/schema';
import { gte } from 'drizzle-orm';
import {
  GetEnrichmentStatsInput,
  GetEnrichmentStatsOutput,
  ProviderStats,
} from './get-enrichment-stats.dto';

/**
 * GetEnrichmentStatsUseCase
 * Obtiene estadísticas agregadas del historial de enriquecimientos
 */
@Injectable()
export class GetEnrichmentStatsUseCase {
  constructor(private readonly drizzle: DrizzleService) {}

  async execute(
    input: GetEnrichmentStatsInput,
  ): Promise<GetEnrichmentStatsOutput> {
    const period = input.period || 'all';

    // Calcular fecha de inicio según el período
    const startDate = this.getStartDate(period);

    // Fetch all logs for the period
    const logsQuery = this.drizzle.db
      .select({
        status: enrichmentLogs.status,
        provider: enrichmentLogs.provider,
        entityType: enrichmentLogs.entityType,
        processingTime: enrichmentLogs.processingTime,
        createdAt: enrichmentLogs.createdAt,
      })
      .from(enrichmentLogs);

    // Apply date filter if needed
    const logs = startDate
      ? await logsQuery.where(gte(enrichmentLogs.createdAt, startDate))
      : await logsQuery;

    // Calcular estadísticas generales
    const totalEnrichments = logs.length;
    const successCount = logs.filter((l) => l.status === 'success').length;
    const partialCount = logs.filter((l) => l.status === 'partial').length;
    const errorCount = logs.filter((l) => l.status === 'error').length;
    const successRate =
      totalEnrichments > 0
        ? Math.round((successCount / totalEnrichments) * 100)
        : 0;

    // Calcular tiempo promedio de procesamiento
    const timesWithValue = logs.filter((l) => l.processingTime !== null);
    const averageProcessingTime =
      timesWithValue.length > 0
        ? Math.round(
            timesWithValue.reduce((sum, l) => sum + (l.processingTime || 0), 0) /
              timesWithValue.length,
          )
        : 0;

    // Estadísticas por proveedor (agrupar en memoria)
    const providerMap = new Map<string, ProviderStats>();
    logs.forEach((log) => {
      if (!providerMap.has(log.provider)) {
        providerMap.set(log.provider, {
          provider: log.provider,
          total: 0,
          success: 0,
          partial: 0,
          error: 0,
          successRate: 0,
        });
      }
      const stats = providerMap.get(log.provider)!;
      stats.total += 1;
      if (log.status === 'success') stats.success += 1;
      if (log.status === 'partial') stats.partial += 1;
      if (log.status === 'error') stats.error += 1;
    });

    // Calcular success rate por proveedor
    const byProvider: ProviderStats[] = Array.from(providerMap.values()).map(
      (stats) => ({
        ...stats,
        successRate:
          stats.total > 0
            ? Math.round((stats.success / stats.total) * 100)
            : 0,
      }),
    );

    // Estadísticas por tipo de entidad (agrupar en memoria)
    const byEntityType = {
      artist: logs.filter((l) => l.entityType === 'artist').length,
      album: logs.filter((l) => l.entityType === 'album').length,
    };

    // Actividad reciente (últimos 7 días)
    const recentActivity = this.calculateRecentActivity(logs);

    return {
      totalEnrichments,
      successCount,
      partialCount,
      errorCount,
      successRate,
      byProvider,
      byEntityType,
      averageProcessingTime,
      recentActivity,
    };
  }

  private getStartDate(period: string): Date | null {
    const now = new Date();
    switch (period) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return weekAgo;
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        return monthAgo;
      }
      default:
        return null;
    }
  }

  private calculateRecentActivity(
    logs: Array<{ createdAt: Date }>,
  ): Array<{ date: string; count: number }> {
    const activityMap = new Map<string, number>();
    const now = new Date();

    // Inicializar últimos 7 días con 0
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      activityMap.set(dateKey, 0);
    }

    // Contar logs por día
    logs.forEach((log) => {
      const dateKey = log.createdAt.toISOString().split('T')[0];
      if (activityMap.has(dateKey)) {
        activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
      }
    });

    return Array.from(activityMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }
}
