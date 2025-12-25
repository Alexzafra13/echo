import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { ListEnrichmentLogsUseCase } from '../infrastructure/use-cases/list-enrichment-logs';
import { GetEnrichmentStatsUseCase } from '../infrastructure/use-cases/get-enrichment-stats';
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
  ) {}

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar historial de enriquecimientos',
    description:
      'Obtiene el historial de enriquecimientos de metadata con filtros opcionales',
  })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({
    name: 'entityType',
    required: false,
    enum: ['artist', 'album'],
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
    description:
      'Obtiene estadísticas agregadas del historial de enriquecimientos',
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
}
