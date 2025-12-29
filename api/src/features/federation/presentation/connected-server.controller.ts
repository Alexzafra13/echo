import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '@infrastructure/database/schema';
import { ConnectedServer } from '../domain/types';
import { RemoteServerService } from '../infrastructure/services';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../domain/ports/federation.repository';
import {
  ConnectToServerDto,
  ConnectedServerResponseDto,
} from './dto';

/**
 * ConnectedServerController - Gestión de servidores conectados
 *
 * Permite a los usuarios conectarse a servidores de amigos y gestionar conexiones.
 */
@ApiTags('federation')
@Controller('federation/servers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConnectedServerController {
  constructor(
    @InjectPinoLogger(ConnectedServerController.name)
    private readonly logger: PinoLogger,
    private readonly remoteServerService: RemoteServerService,
    @Inject(FEDERATION_REPOSITORY)
    private readonly repository: IFederationRepository,
  ) {}

  /**
   * Helper to get a connected server and verify ownership
   */
  private async getServerWithOwnershipCheck(
    serverId: string,
    userId: string,
  ): Promise<ConnectedServer> {
    const server = await this.repository.findConnectedServerById(serverId);
    if (!server) {
      throw new NotFoundException('Server not found');
    }
    if (server.userId !== userId) {
      throw new ForbiddenException('You do not have access to this server');
    }
    return server;
  }

  @Post()
  @ApiOperation({
    summary: 'Conectar a servidor',
    description: 'Conectarse a un servidor de un amigo usando su token de invitación. ' +
      'Si requestMutual es true, se enviará una solicitud para que el servidor remoto también pueda ver tu biblioteca.',
  })
  @ApiResponse({
    status: 201,
    description: 'Conectado exitosamente',
    type: ConnectedServerResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Ya conectado a este servidor' })
  @ApiResponse({ status: 502, description: 'Error al conectar con el servidor remoto' })
  async connectToServer(
    @CurrentUser() user: User,
    @Body() dto: ConnectToServerDto,
  ): Promise<ConnectedServerResponseDto> {
    const server = await this.remoteServerService.connectToServer(
      user.id,
      dto.serverUrl,
      dto.invitationToken,
      dto.serverName,
      dto.localServerUrl,
      dto.requestMutual ?? false,
    );

    this.logger.info(
      { userId: user.id, serverId: server.id, serverUrl: dto.serverUrl, requestMutual: dto.requestMutual },
      'Connected to remote server',
    );

    return this.mapServerToResponse(server);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar servidores conectados',
    description: 'Obtiene todos los servidores a los que el usuario está conectado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de servidores',
    type: [ConnectedServerResponseDto],
  })
  async getConnectedServers(
    @CurrentUser() user: User,
  ): Promise<ConnectedServerResponseDto[]> {
    const servers = await this.repository.findConnectedServersByUserId(user.id);
    return servers.map(this.mapServerToResponse);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener servidor conectado',
  })
  @ApiParam({ name: 'id', description: 'ID del servidor' })
  @ApiResponse({
    status: 200,
    description: 'Servidor encontrado',
    type: ConnectedServerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Servidor no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al servidor' })
  async getConnectedServer(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ConnectedServerResponseDto> {
    const server = await this.getServerWithOwnershipCheck(id, user.id);
    return this.mapServerToResponse(server);
  }

  @Post(':id/sync')
  @ApiOperation({
    summary: 'Sincronizar con servidor',
    description: 'Actualiza la información del servidor remoto',
  })
  @ApiParam({ name: 'id', description: 'ID del servidor' })
  @ApiResponse({
    status: 200,
    description: 'Sincronizado exitosamente',
    type: ConnectedServerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Servidor no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al servidor' })
  async syncServer(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ConnectedServerResponseDto> {
    const server = await this.getServerWithOwnershipCheck(id, user.id);
    const updated = await this.remoteServerService.syncServerStats(server);
    return this.mapServerToResponse(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desconectar de servidor',
  })
  @ApiParam({ name: 'id', description: 'ID del servidor' })
  @ApiResponse({ status: 204, description: 'Desconectado' })
  @ApiResponse({ status: 404, description: 'Servidor no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al servidor' })
  async disconnectFromServer(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    await this.getServerWithOwnershipCheck(id, user.id);
    await this.remoteServerService.disconnectFromServer(id);
    this.logger.info({ userId: user.id, serverId: id }, 'Disconnected from server');
  }

  @Post('health')
  @ApiOperation({
    summary: 'Verificar estado de todos los servidores',
    description: 'Comprueba si los servidores conectados están online y actualiza su estado',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado',
    type: [ConnectedServerResponseDto],
  })
  async checkServersHealth(
    @CurrentUser() user: User,
  ): Promise<ConnectedServerResponseDto[]> {
    this.logger.info({ userId: user.id }, 'Checking health of all connected servers');
    const servers = await this.remoteServerService.checkAllServersHealth(user.id);
    return servers.map(this.mapServerToResponse);
  }

  @Post(':id/health')
  @ApiOperation({
    summary: 'Verificar estado de un servidor',
    description: 'Comprueba si un servidor específico está online',
  })
  @ApiParam({ name: 'id', description: 'ID del servidor' })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado',
    type: ConnectedServerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Servidor no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al servidor' })
  async checkServerHealth(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ConnectedServerResponseDto> {
    const server = await this.getServerWithOwnershipCheck(id, user.id);
    await this.remoteServerService.pingServer(server);
    const updated = await this.repository.findConnectedServerById(id);

    this.logger.info(
      { userId: user.id, serverId: id, isOnline: updated?.isOnline },
      'Server health checked',
    );

    return this.mapServerToResponse(updated!);
  }

  private mapServerToResponse(server: ConnectedServer): ConnectedServerResponseDto {
    return {
      id: server.id,
      name: server.name,
      baseUrl: server.baseUrl,
      isActive: server.isActive,
      isOnline: server.isOnline,
      lastOnlineAt: server.lastOnlineAt ?? undefined,
      lastCheckedAt: server.lastCheckedAt ?? undefined,
      remoteAlbumCount: server.remoteAlbumCount,
      remoteTrackCount: server.remoteTrackCount,
      remoteArtistCount: server.remoteArtistCount,
      lastSyncAt: server.lastSyncAt ?? undefined,
      lastError: server.lastError ?? undefined,
      lastErrorAt: server.lastErrorAt ?? undefined,
      createdAt: server.createdAt,
    };
  }
}
