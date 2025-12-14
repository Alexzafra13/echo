import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Sse,
  Inject,
  NotFoundException,
  ForbiddenException,
  MessageEvent,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Observable, Subject, filter, map } from 'rxjs';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User, AlbumImportQueue } from '@infrastructure/database/schema';
import { AlbumImportService, AlbumImportProgressEvent } from '../domain/services';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../domain/ports/federation.repository';

/**
 * DTO for starting an album import
 */
class StartImportDto {
  serverId!: string;
  remoteAlbumId!: string;
}

/**
 * FederationImportController - Endpoints for album import and progress SSE
 *
 * Responsibilities:
 * - Start album imports from federated servers
 * - List user's imports
 * - Cancel pending imports
 * - Provide SSE stream for real-time progress updates
 */
@ApiTags('federation-import')
@Controller('federation/import')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FederationImportController {
  private progressSubject = new Subject<AlbumImportProgressEvent>();

  constructor(
    @InjectPinoLogger(FederationImportController.name)
    private readonly logger: PinoLogger,
    private readonly importService: AlbumImportService,
    @Inject(FEDERATION_REPOSITORY)
    private readonly repository: IFederationRepository,
  ) {}

  /**
   * Handle import progress events from EventEmitter
   */
  @OnEvent('album-import.progress')
  handleImportProgress(event: AlbumImportProgressEvent): void {
    this.progressSubject.next(event);
  }

  /**
   * POST /federation/import
   * Start importing an album from a connected server
   */
  @Post()
  @ApiOperation({
    summary: 'Iniciar importación de álbum',
    description: 'Inicia la importación de un álbum desde un servidor federado conectado',
  })
  @ApiBody({ type: StartImportDto })
  @ApiResponse({
    status: 201,
    description: 'Importación iniciada',
  })
  @ApiResponse({ status: 404, description: 'Servidor no encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para descargar de este servidor' })
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

    return this.importService.startImport(user.id, server, dto.remoteAlbumId);
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
   * GET /federation/import/events/stream
   * SSE stream for real-time import progress
   *
   * IMPORTANT: This route MUST be defined before :id routes to avoid
   * NestJS treating "events" as a dynamic parameter
   */
  @Get('events/stream')
  @Sse()
  @ApiOperation({
    summary: 'Stream de progreso',
    description: 'Server-Sent Events stream para recibir actualizaciones de progreso en tiempo real',
  })
  streamProgress(@CurrentUser() user: User): Observable<MessageEvent> {
    this.logger.info({ userId: user.id }, 'Client connected to import progress SSE');

    // Send initial connected event
    const connectedEvent: MessageEvent = {
      type: 'connected',
      data: JSON.stringify({ connected: true, userId: user.id }),
    };

    // Create observable that filters events for this user
    const progressEvents = this.progressSubject.pipe(
      filter((event) => event.userId === user.id),
      map((event): MessageEvent => ({
        type: 'import_progress',
        data: JSON.stringify(event),
      })),
    );

    // Return stream starting with connected event
    return new Observable((subscriber) => {
      // Send connected event
      subscriber.next(connectedEvent);

      // Subscribe to progress events
      const subscription = progressEvents.subscribe((event) => {
        subscriber.next(event);
      });

      // Keepalive every 15 seconds to prevent connection timeout
      // Browser/proxy default timeout is ~24-25 seconds, so 15s gives us safe margin
      const keepalive = setInterval(() => {
        subscriber.next({
          type: 'keepalive',
          data: JSON.stringify({ timestamp: new Date().toISOString() }),
        });
      }, 15000);

      // Cleanup on disconnect
      return () => {
        this.logger.info({ userId: user.id }, 'Client disconnected from import progress SSE');
        clearInterval(keepalive);
        subscription.unsubscribe();
      };
    });
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
