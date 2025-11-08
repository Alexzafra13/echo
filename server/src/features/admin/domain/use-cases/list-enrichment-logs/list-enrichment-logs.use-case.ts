import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: ListEnrichmentLogsInput,
  ): Promise<ListEnrichmentLogsOutput> {
    const skip = input.skip || 0;
    const take = input.take || 50;

    // Construir filtros dinámicos
    const where: any = {};

    if (input.entityType) {
      where.entityType = input.entityType;
    }

    if (input.provider) {
      where.provider = input.provider;
    }

    if (input.status) {
      where.status = input.status;
    }

    if (input.entityId) {
      where.entityId = input.entityId;
    }

    if (input.userId) {
      where.userId = input.userId;
    }

    // Filtro por rango de fechas
    if (input.startDate || input.endDate) {
      where.createdAt = {};
      if (input.startDate) {
        where.createdAt.gte = input.startDate;
      }
      if (input.endDate) {
        where.createdAt.lte = input.endDate;
      }
    }

    // Ejecutar consultas en paralelo
    const [logs, total] = await Promise.all([
      this.prisma.enrichmentLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.enrichmentLog.count({ where }),
    ]);

    // Mapear a DTOs
    const logItems = logs.map((log) => ({
      id: log.id,
      entityId: log.entityId,
      entityType: log.entityType,
      entityName: log.entityName,
      provider: log.provider,
      metadataType: log.metadataType,
      status: log.status,
      fieldsUpdated: log.fieldsUpdated,
      errorMessage: log.errorMessage || undefined,
      userId: log.userId || undefined,
      processingTime: log.processingTime || undefined,
      createdAt: log.createdAt,
    }));

    return { logs: logItems, total };
  }
}
