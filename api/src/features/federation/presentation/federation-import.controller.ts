import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadGatewayException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '@infrastructure/database/schema';
import { AlbumImportQueue } from '../domain/types';
import { AlbumImportService } from '../infrastructure/services';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../domain/ports/federation.repository';

/**
 * DTO for starting an album import
 */
class StartImportDto {
  @ApiProperty({ description: 'ID of the connected server' })
  @IsString()
  @IsNotEmpty()
  serverId!: string;

  @ApiProperty({ description: 'ID of the album on the remote server' })
  @IsString()
  @IsNotEmpty()
  remoteAlbumId!: string;
}

/**
 * FederationImportController - Endpoints for album import management
 *
 * Responsibilities:
 * - Start album imports from federated servers
 * - List user's imports
 * - Cancel pending imports
 * - Get import status
 *
 * Real-time progress is delivered via WebSocket (FederationGateway)
 * Connect to /federation namespace and listen for 'import:progress' events
 */
@ApiTags('federation-import')
@Controller('federation/import')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FederationImportController {
  constructor(
    @InjectPinoLogger(FederationImportController.name)
    private readonly logger: PinoLogger,
    private readonly importService: AlbumImportService,
    @Inject(FEDERATION_REPOSITORY)
    private readonly repository: IFederationRepository,
  ) {}

  /**
   * POST /federation/import
   * Start importing an album from a connected server
   */
  @Post()
  @ApiOperation({
    summary: 'Iniciar importación de álbum',
    description: 'Inicia la importación de un álbum desde un servidor federado conectado. ' +
      'El progreso se puede seguir via WebSocket conectando a /federation y escuchando eventos import:progress',
  })
  @ApiBody({ type: StartImportDto })
  @ApiResponse({
    status: 201,
    description: 'Importación iniciada',
  })
  @ApiResponse({ status: 404, description: 'Servidor no encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para descargar de este servidor' })
  @ApiResponse({ status: 502, description: 'Error al conectar con el servidor remoto' })
  async startImport(
    @CurrentUser() user: User,
    @Body() dto: StartImportDto,
  ): Promise<AlbumImportQueue> {
    // Get connected server
    const server = await this.repository.findConnectedServerById(dto.serverId);

    if (!server) {
      throw new NotFoundException('Servidor conectado no encontrado');
    }

    // Verify ownership
    if (server.userId !== user.id) {
      throw new ForbiddenException('No tienes acceso a este servidor');
    }

    this.logger.info(
      { userId: user.id, serverId: dto.serverId, albumId: dto.remoteAlbumId },
      'Starting album import',
    );

    try {
      return await this.importService.startImport(user.id, server, dto.remoteAlbumId);
    } catch (error) {
      // Handle network/connection errors
      if (error instanceof Error && error.message.includes('Cannot connect to remote server')) {
        this.logger.error(
          { userId: user.id, serverId: dto.serverId, error: error.message },
          'Failed to connect to remote server for import',
        );
        throw new BadGatewayException(error.message);
      }
      // Handle fetch errors
      if (error instanceof Error && error.message.includes('Failed to fetch album metadata')) {
        this.logger.error(
          { userId: user.id, serverId: dto.serverId, error: error.message },
          'Failed to fetch album metadata from remote server',
        );
        throw new BadGatewayException(error.message);
      }
      // Re-throw other errors (like ConflictException for duplicates)
      throw error;
    }
  }

  /**
   * GET /federation/import
   * List all imports for the current user
   */
  @Get()
  @ApiOperation({
    summary: 'Listar importaciones',
    description: 'Lista todas las importaciones del usuario actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de importaciones',
  })
  async listImports(@CurrentUser() user: User): Promise<AlbumImportQueue[]> {
    return this.importService.getUserImports(user.id);
  }

  /**
   * GET /federation/import/:id
   * Get import status
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Estado de importación',
    description: 'Obtiene el estado de una importación específica',
  })
  @ApiParam({ name: 'id', description: 'ID de la importación' })
  @ApiResponse({ status: 200, description: 'Estado de la importación' })
  @ApiResponse({ status: 404, description: 'Importación no encontrada' })
  async getImportStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<AlbumImportQueue> {
    const importEntry = await this.importService.getImportStatus(id);

    if (!importEntry) {
      throw new NotFoundException('Importación no encontrada');
    }

    // Verify ownership
    if (importEntry.userId !== user.id) {
      throw new ForbiddenException('No tienes acceso a esta importación');
    }

    return importEntry;
  }

  /**
   * DELETE /federation/import/:id
   * Cancel a pending import
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Cancelar importación',
    description: 'Cancela una importación pendiente',
  })
  @ApiParam({ name: 'id', description: 'ID de la importación' })
  @ApiResponse({ status: 200, description: 'Importación cancelada' })
  @ApiResponse({ status: 404, description: 'Importación no encontrada' })
  async cancelImport(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const importEntry = await this.importService.getImportStatus(id);

    if (!importEntry) {
      throw new NotFoundException('Importación no encontrada');
    }

    // Verify ownership
    if (importEntry.userId !== user.id) {
      throw new ForbiddenException('No tienes acceso a esta importación');
    }

    const success = await this.importService.cancelImport(id);
    return { success };
  }
}
