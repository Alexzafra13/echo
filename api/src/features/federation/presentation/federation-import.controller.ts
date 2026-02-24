import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Sse,
  UseGuards,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadGatewayException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { Public } from '@shared/decorators/public.decorator';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '@infrastructure/database/schema';
import { AlbumImportQueue } from '../domain/types';
import { AlbumImportService, ImportProgressService } from '../infrastructure/services';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../domain/ports/federation.repository';

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

// Importación de álbumes desde servidores federados (progreso via WebSocket /federation)
@ApiTags('federation-import')
@Controller('federation/import')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FederationImportController {
  private static readonly MAX_SSE_CONNECTIONS_PER_USER = 3;
  private readonly activeSSEConnections = new Map<string, number>();

  constructor(
    @InjectPinoLogger(FederationImportController.name)
    private readonly logger: PinoLogger,
    private readonly importService: AlbumImportService,
    private readonly importProgressService: ImportProgressService,
    @Inject(FEDERATION_REPOSITORY)
    private readonly repository: IFederationRepository,
    private readonly jwtService: JwtService,
  ) {}

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
    @Param('id', ParseUUIDPipe) id: string,
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
    @Param('id', ParseUUIDPipe) id: string,
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

  // SSE endpoint - EventSource doesn't support headers, so auth via JWT in query param
  @Sse('progress/stream')
  @Public()
  @ApiOperation({
    summary: 'Stream de progreso de importación (SSE)',
    description: 'Server-Sent Events para recibir actualizaciones de progreso de importación en tiempo real. ' +
      'Pasa token JWT como query param ya que EventSource no soporta headers.',
  })
  @ApiResponse({ status: 200, description: 'Stream de eventos de progreso' })
  @ApiResponse({ status: 403, description: 'Token inválido o expirado' })
  streamImportProgress(
    @Query('token') token: string,
    @Req() request: FastifyRequest,
  ): Observable<MessageEvent> {
    // Validate JWT token from query param (EventSource can't send headers)
    let userId: string;
    try {
      const payload = this.jwtService.verify(token);
      userId = payload.userId;
    } catch {
      this.logger.warn('SSE connection rejected: invalid or expired token');
      return new Observable((subscriber) => {
        subscriber.next({
          type: 'error',
          data: { message: 'Invalid or expired token' },
        } as MessageEvent);
        subscriber.complete();
      });
    }

    // Enforce per-user connection limit
    const currentCount = this.activeSSEConnections.get(userId) || 0;
    if (currentCount >= FederationImportController.MAX_SSE_CONNECTIONS_PER_USER) {
      this.logger.warn(
        { userId, currentCount },
        'SSE connection rejected: max connections per user reached'
      );
      return new Observable((subscriber) => {
        subscriber.next({
          type: 'error',
          data: { message: 'Too many active connections' },
        } as MessageEvent);
        subscriber.complete();
      });
    }

    this.activeSSEConnections.set(userId, currentCount + 1);
    this.logger.info({ userId, connections: currentCount + 1 }, 'SSE client connected for import progress');

    return new Observable((subscriber) => {
      // Send initial connected event
      subscriber.next({
        type: 'connected',
        data: { userId, timestamp: Date.now() },
      } as MessageEvent);

      // Subscribe to progress events for this user
      const subscription = this.importProgressService
        .subscribeForUser(userId)
        .pipe(
          map((event) => ({
            type: 'import:progress',
            data: event,
          } as MessageEvent)),
        )
        .subscribe((event) => subscriber.next(event));

      // Send keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        subscriber.next({
          type: 'keepalive',
          data: { timestamp: Date.now() },
        } as MessageEvent);
      }, 30000);

      // Cleanup on client disconnect
      request.raw.on('close', () => {
        const count = this.activeSSEConnections.get(userId) || 1;
        if (count <= 1) {
          this.activeSSEConnections.delete(userId);
        } else {
          this.activeSSEConnections.set(userId, count - 1);
        }
        this.logger.info({ userId, connections: count - 1 }, 'SSE client disconnected from import progress');
        subscription.unsubscribe();
        clearInterval(keepaliveInterval);
        subscriber.complete();
      });
    });
  }
}
