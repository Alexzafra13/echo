import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { enrichmentLogs } from '@infrastructure/database/schema';
import { eq, gte, lte, desc, and, count, SQL } from 'drizzle-orm';
import {
  ListEnrichmentLogsInput,
  ListEnrichmentLogsOutput,
} from './list-enrichment-logs.dto';

/**
 * ListEnrichmentLogsUseCase
 * Lista el historial de enriquecimientos de metadata con filtros
 */
@Injectable()
export class ListEnrichmentLogsUseCase {
  constructor(private readonly drizzle: DrizzleService) {}

  async execute(
    input: ListEnrichmentLogsInput,
  ): Promise<ListEnrichmentLogsOutput> {
    const skip = input.skip || 0;
    const take = input.take || 50;

    // Construir filtros dinámicos
    const whereConditions: SQL[] = [];

    if (input.entityType) {
      whereConditions.push(eq(enrichmentLogs.entityType, input.entityType));
    }

    if (input.provider) {
      whereConditions.push(eq(enrichmentLogs.provider, input.provider));
    }

    if (input.status) {
      whereConditions.push(eq(enrichmentLogs.status, input.status));
    }

    if (input.entityId) {
      whereConditions.push(eq(enrichmentLogs.entityId, input.entityId));
    }

    if (input.userId) {
      whereConditions.push(eq(enrichmentLogs.userId, input.userId));
    }

    // Filtro por rango de fechas
    if (input.startDate) {
      whereConditions.push(gte(enrichmentLogs.createdAt, input.startDate));
    }

    if (input.endDate) {
      whereConditions.push(lte(enrichmentLogs.createdAt, input.endDate));
    }

    // Combine conditions with AND, or undefined if no conditions
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Ejecutar consultas en paralelo
    const [logs, totalResult] = await Promise.all([
      this.drizzle.db
        .select()
        .from(enrichmentLogs)
        .where(whereClause)
        .orderBy(desc(enrichmentLogs.createdAt))
        .limit(take)
        .offset(skip),
      this.drizzle.db
        .select({ count: count() })
        .from(enrichmentLogs)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    // Mapear a DTOs
    const logItems = logs.map((log) => ({
      id: log.id,
      entityId: log.entityId,
      entityType: log.entityType,
      entityName: log.entityName,
      provider: log.provider,
      metadataType: log.metadataType,
      status: log.status,
      fieldsUpdated: log.fieldsUpdated || [],
      errorMessage: log.errorMessage || undefined,
      previewUrl: log.previewUrl || undefined,
      userId: log.userId || undefined,
      processingTime: log.processingTime || undefined,
      createdAt: log.createdAt,
    }));

    return { logs: logItems, total };
  }
}
