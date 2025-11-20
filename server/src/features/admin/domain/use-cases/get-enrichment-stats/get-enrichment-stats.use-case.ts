import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: GetEnrichmentStatsInput,
  ): Promise<GetEnrichmentStatsOutput> {
    const period = input.period || 'all';

    // Calcular fecha de inicio según el período
    const startDate = this.getStartDate(period);
    const where = startDate ? { createdAt: { gte: startDate } } : {};

    // Consultas en paralelo
    const [logs, providerGroups, entityTypeGroups] = await Promise.all([
      // Todos los logs del período
      this.prisma.enrichmentLog.findMany({
        where,
        select: {
          status: true,
          provider: true,
          entityType: true,
          processingTime: true,
          createdAt: true,
        },
      }),
      // Agrupar por proveedor y estado
      this.prisma.enrichmentLog.groupBy({
        by: ['provider', 'status'],
        where,
        _count: { id: true },
      }),
      // Agrupar por tipo de entidad
      this.prisma.enrichmentLog.groupBy({
        by: ['entityType'],
        where,
        _count: { id: true },
      }),
    ]);

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

    // Estadísticas por proveedor
    const providerMap = new Map<string, ProviderStats>();
    providerGroups.forEach((group) => {
      if (!providerMap.has(group.provider)) {
        providerMap.set(group.provider, {
          provider: group.provider,
          total: 0,
          success: 0,
          partial: 0,
          error: 0,
          successRate: 0,
        });
      }
      const stats = providerMap.get(group.provider)!;
      stats.total += group._count.id;
      if (group.status === 'success') stats.success = group._count.id;
      if (group.status === 'partial') stats.partial = group._count.id;
      if (group.status === 'error') stats.error = group._count.id;
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

    // Estadísticas por tipo de entidad
    const byEntityType = {
      artist:
        entityTypeGroups.find((g) => g.entityType === 'artist')?._count.id ||
        0,
      album:
        entityTypeGroups.find((g) => g.entityType === 'album')?._count.id || 0,
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
