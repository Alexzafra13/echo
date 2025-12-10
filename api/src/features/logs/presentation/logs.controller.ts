import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { LogService, LogLevel, LogCategory } from '../application/log.service';

/**
 * LogsController
 *
 * Endpoints para administradores para consultar logs del sistema
 */
@ApiTags('logs')
@Controller('logs')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class LogsController {
  constructor(private readonly logService: LogService) {}

  /**
   * GET /api/logs
   * Obtener logs con filtros
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener logs del sistema',
    description:
      'Retorna logs filtrados por nivel, categoría, fechas, etc. Solo para administradores.',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: LogLevel,
    description: 'Filtrar por nivel de severidad',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: LogCategory,
    description: 'Filtrar por categoría',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filtrar por usuario',
  })
  @ApiQuery({
    name: 'entityId',
    required: false,
    type: String,
    description: 'Filtrar por entidad (track, album, artist, etc.)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Fecha inicial (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Fecha final (ISO 8601)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Número de logs a retornar (máx 500)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Offset para paginación',
  })
  @ApiResponse({
    status: 200,
    description: 'Logs obtenidos exitosamente',
    schema: {
      type: 'object',
      properties: {
        logs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              level: { type: 'string', enum: Object.values(LogLevel) },
              category: { type: 'string', enum: Object.values(LogCategory) },
              message: { type: 'string' },
              details: { type: 'string', nullable: true },
              userId: { type: 'string', nullable: true },
              entityId: { type: 'string', nullable: true },
              entityType: { type: 'string', nullable: true },
              stackTrace: { type: 'string', nullable: true },
              requestId: { type: 'string', nullable: true },
              ipAddress: { type: 'string', nullable: true },
              userAgent: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No autorizado (solo admins)' })
  async getLogs(
    @Query('level') level?: LogLevel,
    @Query('category') category?: LogCategory,
    @Query('userId') userId?: string,
    @Query('entityId') entityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 100;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

    return await this.logService.getLogs({
      level,
      category,
      userId,
      entityId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset,
    });
  }

  /**
   * GET /api/logs/stats
   * Obtener estadísticas de logs
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener estadísticas de logs',
    description:
      'Retorna estadísticas agregadas de logs (contadores por nivel, categoría, etc.)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Fecha inicial (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Fecha final (ISO 8601)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalLogs: { type: 'number' },
        byLevel: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        byCategory: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
      },
    },
  })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.logService.getLogStats({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * GET /api/logs/categories
   * Obtener lista de categorías disponibles
   */
  @Get('categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener categorías de logs',
    description: 'Retorna lista de todas las categorías de logs disponibles',
  })
  @ApiResponse({
    status: 200,
    description: 'Categorías obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  getCategories() {
    return {
      categories: Object.values(LogCategory),
    };
  }

  /**
   * GET /api/logs/levels
   * Obtener lista de niveles disponibles
   */
  @Get('levels')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener niveles de severidad',
    description: 'Retorna lista de todos los niveles de severidad disponibles',
  })
  @ApiResponse({
    status: 200,
    description: 'Niveles obtenidos exitosamente',
    schema: {
      type: 'object',
      properties: {
        levels: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  getLevels() {
    return {
      levels: Object.values(LogLevel),
    };
  }

  /**
   * GET /api/logs/storage
   * Obtener tamaño de almacenamiento de logs
   */
  @Get('storage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener tamaño de almacenamiento de logs',
    description: 'Retorna el número de filas y tamaño estimado en MB',
  })
  @ApiResponse({
    status: 200,
    description: 'Tamaño obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalRows: { type: 'number' },
        estimatedSizeMB: { type: 'number' },
      },
    },
  })
  async getStorageSize() {
    return await this.logService.getLogsStorageSize();
  }
}
