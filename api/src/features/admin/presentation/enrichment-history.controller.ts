import { Controller, Get, Post, Delete, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { enrichmentLogs } from '@infrastructure/database/schema';
import { lte } from 'drizzle-orm';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { ListEnrichmentLogsUseCase } from '../infrastructure/use-cases/list-enrichment-logs';
import { GetEnrichmentStatsUseCase } from '../infrastructure/use-cases/get-enrichment-stats';
import { BackfillEnrichmentLogsUseCase } from '../infrastructure/use-cases/backfill-enrichment-logs';

const ENRICHMENT_RETENTION_KEY = 'enrichment_logs.retention_days';
const DEFAULT_ENRICHMENT_RETENTION_DAYS = 30;
import {
  ListEnrichmentLogsRequestDto,
  ListEnrichmentLogsResponseDto,
  GetEnrichmentStatsRequestDto,
  GetEnrichmentStatsResponseDto,
} from './dtos';

@ApiTags('admin/metadata')
@ApiBearerAuth('JWT-auth')
@Controller('admin/metadata/enrichment')
@UseGuards(JwtAuthGuard, AdminGuard)
export class EnrichmentHistoryController {
  constructor(
    private readonly listEnrichmentLogsUseCase: ListEnrichmentLogsUseCase,
    private readonly getEnrichmentStatsUseCase: GetEnrichmentStatsUseCase,
    private readonly backfillEnrichmentLogsUseCase: BackfillEnrichmentLogsUseCase,
    private readonly drizzle: DrizzleService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar historial de enriquecimientos',
    description: 'Obtiene el historial de enriquecimientos de metadata con filtros opcionales',
  })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({
    name: 'entityType',
    required: false,
    enum: ['artist', 'album', 'radio'],
  })
  @ApiQuery({ name: 'provider', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['success', 'partial', 'error'],
  })
  @ApiQuery({ name: 'entityId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Listado de enriquecimientos',
    type: ListEnrichmentLogsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos de administrador',
  })
  async listEnrichmentLogs(@Query() query: ListEnrichmentLogsRequestDto) {
    const result = await this.listEnrichmentLogsUseCase.execute({
      skip: query.skip,
      take: query.take,
      entityType: query.entityType,
      provider: query.provider,
      status: query.status,
      entityId: query.entityId,
      userId: query.userId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    return ListEnrichmentLogsResponseDto.fromDomain(result);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener estadísticas de enriquecimientos',
    description: 'Obtiene estadísticas agregadas del historial de enriquecimientos',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'week', 'month', 'all'],
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de enriquecimientos',
    type: GetEnrichmentStatsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos de administrador',
  })
  async getEnrichmentStats(@Query() query: GetEnrichmentStatsRequestDto) {
    const result = await this.getEnrichmentStatsUseCase.execute({
      period: query.period,
    });

    return GetEnrichmentStatsResponseDto.fromDomain(result);
  }

  @Post('backfill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Backfill enrichment logs',
    description:
      'Genera registros de enriquecimiento históricos basados en datos existentes de artistas y álbumes. ' +
      'Útil cuando el sistema de logging se implementó después del enriquecimiento inicial.',
  })
  @ApiResponse({
    status: 200,
    description: 'Backfill completado',
    schema: {
      type: 'object',
      properties: {
        created: { type: 'number' },
        artists: { type: 'number' },
        albums: { type: 'number' },
      },
    },
  })
  async backfillLogs() {
    return await this.backfillEnrichmentLogsUseCase.execute();
  }

  @Get('retention')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener retención de logs de enriquecimiento',
    description: 'Retorna los días de retención configurados para logs de enriquecimiento.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        retentionDays: { type: 'number' },
      },
    },
  })
  async getRetention() {
    const days = await this.settingsService.getNumber(
      ENRICHMENT_RETENTION_KEY,
      DEFAULT_ENRICHMENT_RETENTION_DAYS,
    );
    return { retentionDays: Math.max(1, days) };
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limpiar logs de enriquecimiento antiguos',
    description: 'Elimina logs de enriquecimiento anteriores al período de retención configurado.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number' },
        retentionDays: { type: 'number' },
      },
    },
  })
  async cleanupOldLogs() {
    const retentionDays = await this.settingsService.getNumber(
      ENRICHMENT_RETENTION_KEY,
      DEFAULT_ENRICHMENT_RETENTION_DAYS,
    );
    const days = Math.max(1, retentionDays);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.drizzle.db
      .delete(enrichmentLogs)
      .where(lte(enrichmentLogs.createdAt, cutoffDate))
      .returning({ id: enrichmentLogs.id });

    return { deletedCount: result.length, retentionDays: days };
  }

  @Delete('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar todos los logs de enriquecimiento',
    description: 'Elimina todos los registros del historial de enriquecimiento. Acción irreversible.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logs eliminados',
    schema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number' },
      },
    },
  })
  async deleteAllEnrichmentLogs() {
    const result = await this.drizzle.db
      .delete(enrichmentLogs)
      .returning({ id: enrichmentLogs.id });

    return { deletedCount: result.length };
  }
}
