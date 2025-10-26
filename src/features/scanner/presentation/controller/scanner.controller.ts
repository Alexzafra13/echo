import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@features/auth/infrastructure/guards/jwt-auth.guard';
import { AdminGuard } from '@features/admin/infrastructure/guards/admin.guard';
import {
  StartScanUseCase,
  GetScanStatusUseCase,
  GetScansHistoryUseCase,
} from '../../domain/use-cases';
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
  constructor(
    private readonly startScanUseCase: StartScanUseCase,
    private readonly getScanStatusUseCase: GetScanStatusUseCase,
    private readonly getScansHistoryUseCase: GetScansHistoryUseCase,
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
}
