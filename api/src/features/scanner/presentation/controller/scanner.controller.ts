import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
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
import {
  StartScanUseCase,
  GetScanStatusUseCase,
  GetScansHistoryUseCase,
} from '../../domain/use-cases';
import { LufsAnalysisQueueService, LufsQueueStats } from '../../infrastructure/services/lufs-analysis-queue.service';
import { LibraryCleanupService, PurgeMode } from '../../infrastructure/services/scanning/library-cleanup.service';
import {
  StartScanRequestDto,
  StartScanResponseDto,
  ScanStatusResponseDto,
  ScansHistoryQueryDto,
  ScansHistoryResponseDto,
} from '../dtos';

/**
 * ScannerController - Endpoints para escaneo de librería
 *
 * Responsabilidades:
 * - Proveer endpoints REST para escaneo
 * - Validar entrada con DTOs
 * - Delegar lógica a use cases
 * - Retornar respuestas HTTP apropiadas
 *
 * Seguridad:
 * - Requiere autenticación JWT
 * - Requiere permisos de administrador
 */
@ApiTags('Scanner')
@ApiBearerAuth()
@Controller('scanner')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ScannerController {
  private readonly logger = new Logger(ScannerController.name);

  constructor(
    private readonly startScanUseCase: StartScanUseCase,
    private readonly getScanStatusUseCase: GetScanStatusUseCase,
    private readonly getScansHistoryUseCase: GetScansHistoryUseCase,
    private readonly lufsQueueService: LufsAnalysisQueueService,
    private readonly libraryCleanup: LibraryCleanupService,
  ) {}

  /**
   * POST /scanner/start - Inicia un nuevo escaneo de la librería
   */
  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Inicia un nuevo escaneo de la librería musical' })
  @ApiResponse({
    status: 202,
    description: 'Escaneo iniciado exitosamente',
    type: StartScanResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No autorizado (solo admins)' })
  @ApiResponse({ status: 400, description: 'Ya hay un escaneo en progreso' })
  async startScan(
    @Body() dto: StartScanRequestDto,
  ): Promise<StartScanResponseDto> {
    const result = await this.startScanUseCase.execute({
      path: dto.path,
      recursive: dto.recursive,
      pruneDeleted: dto.pruneDeleted,
    });

    return result as StartScanResponseDto;
  }

  /**
   * GET /scanner/lufs-status - Obtiene el estado del análisis LUFS
   */
  @Get('lufs-status')
  @ApiOperation({ summary: 'Obtiene el estado del análisis LUFS en segundo plano' })
  @ApiResponse({
    status: 200,
    description: 'Estado del análisis LUFS',
  })
  async getLufsStatus(): Promise<LufsQueueStats> {
    return this.lufsQueueService.getQueueStats();
  }

  /**
   * GET /scanner/:id - Obtiene el estado de un escaneo
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el estado de un escaneo específico' })
  @ApiResponse({
    status: 200,
    description: 'Estado del escaneo',
    type: ScanStatusResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No autorizado (solo admins)' })
  @ApiResponse({ status: 404, description: 'Escaneo no encontrado' })
  async getScanStatus(@Param('id') id: string): Promise<ScanStatusResponseDto> {
    const result = await this.getScanStatusUseCase.execute({ id });
    return result as ScanStatusResponseDto;
  }

  /**
   * GET /scanner - Obtiene el historial de escaneos
   */
  @Get()
  @ApiOperation({ summary: 'Obtiene el historial de escaneos' })
  @ApiResponse({
    status: 200,
    description: 'Historial de escaneos',
    type: ScansHistoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No autorizado (solo admins)' })
  async getScansHistory(
    @Query() query: ScansHistoryQueryDto,
  ): Promise<ScansHistoryResponseDto> {
    const result = await this.getScansHistoryUseCase.execute({
      page: query.page,
      limit: query.limit,
    });

    return result as ScansHistoryResponseDto;
  }

  // ========================
  // MISSING FILES ENDPOINTS
  // ========================

  /**
   * GET /scanner/missing-files - Lista archivos marcados como desaparecidos
   */
  @Get('missing-files')
  @ApiOperation({
    summary: 'Get missing files',
    description: 'Returns list of tracks marked as missing (file not found on disk)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of missing files',
    schema: {
      type: 'object',
      properties: {
        tracks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              path: { type: 'string' },
              albumName: { type: 'string', nullable: true },
              artistName: { type: 'string', nullable: true },
              missingAt: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        },
        count: { type: 'number' },
        purgeMode: { type: 'string' },
      },
    },
  })
  async getMissingFiles() {
    try {
      const [tracks, purgeMode] = await Promise.all([
        this.libraryCleanup.getMissingTracks(),
        this.libraryCleanup.getPurgeMode(),
      ]);

      return {
        tracks,
        count: tracks.length,
        purgeMode,
      };
    } catch (error) {
      this.logger.error(`Error getting missing files: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * POST /scanner/missing-files/purge - Purga archivos desaparecidos
   */
  @Post('missing-files/purge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Purge missing files',
    description: 'Deletes tracks that have been missing based on purge mode settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Purge result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        deleted: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  async purgeMissingFiles() {
    try {
      this.logger.log('Manual purge of missing files requested');
      const deleted = await this.libraryCleanup.purgeOldMissingTracks();

      return {
        success: true,
        deleted,
        message: deleted > 0
          ? `Eliminados ${deleted} tracks desaparecidos`
          : 'No hay tracks para eliminar según la configuración actual',
      };
    } catch (error) {
      this.logger.error(`Error purging missing files: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * DELETE /scanner/missing-files/:id - Elimina un track específico marcado como desaparecido
   */
  @Delete('missing-files/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete specific missing track',
    description: 'Permanently deletes a specific track that is marked as missing',
  })
  @ApiResponse({
    status: 200,
    description: 'Deletion result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async deleteMissingTrack(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting missing track: ${id}`);

      const result = await this.libraryCleanup.deleteMissingTrackById(id);

      if (!result.trackDeleted) {
        return {
          success: false,
          message: 'No se pudo eliminar el track. Puede que no exista o no esté marcado como desaparecido.',
        };
      }

      return {
        success: true,
        message: `Track ${id} eliminado correctamente`,
        albumDeleted: result.albumDeleted,
        artistDeleted: result.artistDeleted,
      };
    } catch (error) {
      this.logger.error(`Error deleting missing track ${id}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * GET /scanner/missing-files/purge-mode - Obtiene el modo de purga actual
   */
  @Get('missing-files/purge-mode')
  @ApiOperation({
    summary: 'Get purge mode',
    description: 'Returns the current purge mode setting for missing files',
  })
  @ApiResponse({
    status: 200,
    description: 'Current purge mode',
    schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['never', 'always', 'after_days:N'] },
      },
    },
  })
  async getPurgeMode() {
    const mode = await this.libraryCleanup.getPurgeMode();
    return { mode };
  }
}
