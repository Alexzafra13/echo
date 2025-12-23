import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { Public } from '@shared/decorators/public.decorator';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User, ConnectedServer } from '@infrastructure/database/schema';
import { FederationTokenService, RemoteServerService } from '../domain/services';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../domain/ports/federation.repository';
import { StreamTokenService } from '@features/streaming/domain/stream-token.service';
import {
  CreateInvitationTokenDto,
  ConnectToServerDto,
  UpdatePermissionsDto,
  PaginationQueryDto,
  InvitationTokenResponseDto,
  ConnectedServerResponseDto,
  AccessTokenResponseDto,
  RemoteLibraryResponseDto,
  RemoteAlbumDto,
  SharedAlbumsResponseDto,
  SharedLibrariesQueryDto,
} from './dto';

/**
 * FederationController - Gestión de conexiones entre servidores Echo
 *
 * Permite a los usuarios:
 * - Crear tokens de invitación para que otros se conecten
 * - Conectarse a servidores de amigos
 * - Ver y gestionar servidores conectados
 * - Navegar bibliotecas remotas
 */
@ApiTags('federation')
@Controller('federation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FederationController {
  constructor(
    @InjectPinoLogger(FederationController.name)
    private readonly logger: PinoLogger,
    private readonly tokenService: FederationTokenService,
    private readonly remoteServerService: RemoteServerService,
    @Inject(FEDERATION_REPOSITORY)
    private readonly repository: IFederationRepository,
    private readonly streamTokenService: StreamTokenService,
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

  // ============================================
  // Invitation Tokens (Para que otros se conecten a ti)
  // ============================================

  @Post('invitations')
  @ApiOperation({
    summary: 'Crear token de invitación',
    description: 'Crea un token que otros pueden usar para conectarse a tu servidor',
  })
  @ApiResponse({
    status: 201,
    description: 'Token creado exitosamente',
    type: InvitationTokenResponseDto,
  })
  async createInvitationToken(
    @CurrentUser() user: User,
    @Body() dto: CreateInvitationTokenDto,
  ): Promise<InvitationTokenResponseDto> {
    const token = await this.tokenService.generateInvitationToken(
      user.id,
      dto.name,
      dto.expiresInDays,
      dto.maxUses,
    );

    this.logger.info({ userId: user.id, tokenId: token.id }, 'Invitation token created');

    return {
      id: token.id,
      token: token.token,
      name: token.name ?? undefined,
      expiresAt: token.expiresAt,
      maxUses: token.maxUses,
      currentUses: token.currentUses,
      isUsed: token.isUsed,
      createdAt: token.createdAt,
    };
  }

  @Get('invitations')
  @ApiOperation({
    summary: 'Listar tokens de invitación',
    description: 'Obtiene todos los tokens de invitación creados por el usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tokens',
    type: [InvitationTokenResponseDto],
  })
  async getInvitationTokens(
    @CurrentUser() user: User,
  ): Promise<InvitationTokenResponseDto[]> {
    const tokens = await this.tokenService.getUserInvitationTokens(user.id);

    return tokens.map((token) => ({
      id: token.id,
      token: token.token,
      name: token.name ?? undefined,
      expiresAt: token.expiresAt,
      maxUses: token.maxUses,
      currentUses: token.currentUses,
      isUsed: token.isUsed,
      createdAt: token.createdAt,
    }));
  }

  @Delete('invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar token de invitación',
  })
  @ApiParam({ name: 'id', description: 'ID del token' })
  @ApiResponse({ status: 204, description: 'Token eliminado' })
  @ApiResponse({ status: 404, description: 'Token no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al token' })
  async deleteInvitationToken(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    // Verify ownership before deleting
    const token = await this.repository.findFederationTokenById(id);
    if (!token) {
      throw new NotFoundException('Invitation token not found');
    }
    if (token.createdByUserId !== user.id) {
      throw new ForbiddenException('You do not have access to this token');
    }
    await this.tokenService.deleteInvitationToken(id);
    this.logger.info({ userId: user.id, tokenId: id }, 'Invitation token deleted');
  }

  // ============================================
  // Connected Servers (Servidores a los que te has conectado)
  // ============================================

  @Post('servers')
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

  @Get('servers')
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

  @Get('servers/:id')
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

  @Post('servers/:id/sync')
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

  @Delete('servers/:id')
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
    // Verify ownership before disconnecting
    await this.getServerWithOwnershipCheck(id, user.id);
    await this.remoteServerService.disconnectFromServer(id);
    this.logger.info({ userId: user.id, serverId: id }, 'Disconnected from server');
  }

  @Post('servers/health')
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

  @Post('servers/:id/health')
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

  // ============================================
  // Shared Libraries (Álbums de todos los servidores)
  // ============================================

  @Get('shared-albums')
  @ApiOperation({
    summary: 'Ver álbums de todos los servidores conectados',
    description: 'Obtiene álbums agregados de todos los servidores conectados (para la sección Bibliotecas Compartidas)',
  })
  @ApiResponse({
    status: 200,
    description: 'Álbums compartidos',
    type: SharedAlbumsResponseDto,
  })
  async getSharedAlbums(
    @CurrentUser() user: User,
    @Query() query: SharedLibrariesQueryDto,
  ): Promise<SharedAlbumsResponseDto> {
    const servers = await this.repository.findConnectedServersByUserId(user.id);

    // If specific server requested, filter to just that one
    const targetServers = query.serverId
      ? servers.filter(s => s.id === query.serverId)
      : servers.filter(s => s.isOnline !== false); // Only query online servers

    if (targetServers.length === 0) {
      return { albums: [], total: 0, serverCount: 0 };
    }

    // Fetch albums from each server in parallel
    const results = await Promise.allSettled(
      targetServers.map(async (server) => {
        try {
          const result = await this.remoteServerService.getRemoteAlbums(
            server,
            query.page || 1,
            query.limit || 20,
            query.search,
          );
          return {
            server,
            albums: result.albums,
            total: result.total,
          };
        } catch (error) {
          this.logger.warn(
            { serverId: server.id, error: error instanceof Error ? error.message : error },
            'Failed to fetch albums from server',
          );
          return { server, albums: [], total: 0 };
        }
      }),
    );

    // Aggregate results
    const allAlbums: SharedAlbumsResponseDto['albums'] = [];
    let totalCount = 0;
    let successfulServers = 0;

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.albums.length > 0) {
        successfulServers++;
        totalCount += result.value.total;
        for (const album of result.value.albums) {
          allAlbums.push({
            ...album,
            serverId: result.value.server.id,
            serverName: result.value.server.name,
            // Transform coverUrl to use local proxy endpoint
            coverUrl: album.coverUrl
              ? `/api/federation/servers/${result.value.server.id}/albums/${album.id}/cover`
              : undefined,
          });
        }
      }
    }

    // Sort by name (could be enhanced with more sorting options)
    allAlbums.sort((a, b) => a.name.localeCompare(b.name));

    return {
      albums: allAlbums.slice(0, query.limit || 20),
      total: totalCount,
      serverCount: successfulServers,
    };
  }

  // ============================================
  // Remote Library (Navegar biblioteca de servidor remoto)
  // ============================================

  @Get('servers/:id/library')
  @ApiOperation({
    summary: 'Ver biblioteca de servidor remoto',
    description: 'Obtiene la biblioteca completa de un servidor conectado',
  })
  @ApiParam({ name: 'id', description: 'ID del servidor' })
  @ApiResponse({
    status: 200,
    description: 'Biblioteca del servidor',
    type: RemoteLibraryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Servidor no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al servidor' })
  async getRemoteLibrary(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<RemoteLibraryResponseDto> {
    const server = await this.getServerWithOwnershipCheck(id, user.id);
    const library = await this.remoteServerService.getRemoteLibrary(server, query.page, query.limit);
    // Transform coverUrls to use local proxy endpoint
    return {
      ...library,
      albums: library.albums.map((album) => ({
        ...album,
        coverUrl: album.coverUrl
          ? `/api/federation/servers/${id}/albums/${album.id}/cover`
          : undefined,
      })),
    };
  }

  @Get('servers/:id/albums')
  @ApiOperation({
    summary: 'Ver álbums de servidor remoto',
  })
  @ApiParam({ name: 'id', description: 'ID del servidor' })
  @ApiResponse({
    status: 200,
    description: 'Álbums del servidor',
  })
  @ApiResponse({ status: 404, description: 'Servidor no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al servidor' })
  async getRemoteAlbums(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<{ albums: RemoteAlbumDto[]; total: number }> {
    const server = await this.getServerWithOwnershipCheck(id, user.id);
    const result = await this.remoteServerService.getRemoteAlbums(
      server,
      query.page,
      query.limit,
      query.search,
    );
    // Transform coverUrls to use local proxy endpoint
    return {
      ...result,
      albums: result.albums.map((album) => ({
        ...album,
        coverUrl: album.coverUrl
          ? `/api/federation/servers/${id}/albums/${album.id}/cover`
          : undefined,
      })),
    };
  }

  @Get('servers/:id/albums/:albumId')
  @ApiOperation({
    summary: 'Ver álbum de servidor remoto con tracks',
  })
  @ApiParam({ name: 'id', description: 'ID del servidor' })
  @ApiParam({ name: 'albumId', description: 'ID del álbum remoto' })
  @ApiResponse({ status: 404, description: 'Servidor no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al servidor' })
  async getRemoteAlbum(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('albumId') albumId: string,
  ) {
    const server = await this.getServerWithOwnershipCheck(id, user.id);
    const album = await this.remoteServerService.getRemoteAlbum(server, albumId);
    // Transform coverUrl to use local proxy endpoint
    return {
      ...album,
      coverUrl: album.coverUrl
        ? `/api/federation/servers/${id}/albums/${album.id}/cover`
        : undefined,
    };
  }

  @Get('servers/:id/albums/:albumId/cover')
  @Public()
  @ApiOperation({
    summary: 'Obtener carátula de álbum remoto',
    description: 'Proxy para obtener la carátula de un álbum de un servidor federado. ' +
      'Este endpoint es público ya que las carátulas no son datos sensibles.',
  })
  @ApiParam({ name: 'id', description: 'ID del servidor' })
  @ApiParam({ name: 'albumId', description: 'ID del álbum remoto' })
  @ApiResponse({ status: 200, description: 'Carátula del álbum' })
  @ApiResponse({ status: 404, description: 'Servidor o carátula no encontrada' })
  async getRemoteAlbumCover(
    @Param('id') id: string,
    @Param('albumId') albumId: string,
    @Res() res: FastifyReply,
  ) {
    // Get server directly (endpoint is public, covers are not sensitive data)
    const server = await this.repository.findConnectedServerById(id);
    if (!server) {
      res.status(HttpStatus.NOT_FOUND).send({ error: 'Server not found' });
      return;
    }

    const cover = await this.remoteServerService.getRemoteAlbumCover(server, albumId);

    if (!cover) {
      res.status(HttpStatus.NOT_FOUND).send({ error: 'Cover not found' });
      return;
    }

    res.header('Content-Type', cover.contentType);
    res.header('Cache-Control', 'public, max-age=86400');
    res.send(cover.buffer);
  }

  @Get('servers/:id/tracks/:trackId/stream')
  @Public()
  @ApiOperation({
    summary: 'Stream de track desde servidor remoto',
    description: 'Proxy para hacer streaming de un track desde un servidor federado. ' +
      'Este endpoint acepta autenticación via stream token en query parameter (para HTML5 audio) ' +
      'o via JWT header.',
  })
  @ApiParam({ name: 'id', description: 'ID del servidor' })
  @ApiParam({ name: 'trackId', description: 'ID del track remoto' })
  @ApiQuery({ name: 'token', description: 'Stream token for authentication', required: true })
  @ApiResponse({ status: 200, description: 'Stream de audio' })
  @ApiResponse({ status: 401, description: 'Token inválido o no proporcionado' })
  @ApiResponse({ status: 404, description: 'Servidor o track no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al servidor' })
  async streamRemoteTrack(
    @Param('id') id: string,
    @Param('trackId') trackId: string,
    @Query('token') token: string | undefined,
    @Headers('range') range: string | undefined,
    @Res() res: FastifyReply,
  ) {
    // Validate stream token
    if (!token) {
      res.status(HttpStatus.UNAUTHORIZED).send({ error: 'Stream token is required' });
      return;
    }

    const userId = await this.streamTokenService.validateToken(token);
    if (!userId) {
      res.status(HttpStatus.UNAUTHORIZED).send({ error: 'Invalid or expired stream token' });
      return;
    }

    // Get server and verify ownership
    const server = await this.repository.findConnectedServerById(id);
    if (!server) {
      res.status(HttpStatus.NOT_FOUND).send({ error: 'Server not found' });
      return;
    }
    if (server.userId !== userId) {
      res.status(HttpStatus.FORBIDDEN).send({ error: 'You do not have access to this server' });
      return;
    }

    try {
      const streamResult = await this.remoteServerService.streamRemoteTrack(
        server,
        trackId,
        range,
      );

      if (!streamResult) {
        res.status(HttpStatus.NOT_FOUND).send({ error: 'Track not found' });
        return;
      }

      // Use res.raw.writeHead for proper streaming with Fastify
      // This ensures headers are sent correctly before the stream starts
      res.raw.writeHead(streamResult.statusCode, streamResult.headers);

      // Handle stream errors
      streamResult.stream.on('error', (error) => {
        this.logger.error(
          { serverId: id, trackId, error: error instanceof Error ? error.message : error },
          'Stream error from remote server',
        );
        if (!res.raw.destroyed) {
          res.raw.destroy();
        }
      });

      // Pipe the stream to response
      streamResult.stream.pipe(res.raw);
    } catch (error) {
      this.logger.error(
        { serverId: id, trackId, error: error instanceof Error ? error.message : error },
        'Failed to stream remote track',
      );
      res.status(HttpStatus.BAD_GATEWAY).send({ error: 'Failed to stream from remote server' });
    }
  }

  // ============================================
  // Access Tokens (Servidores que pueden acceder a tu biblioteca)
  // ============================================

  @Get('access-tokens')
  @ApiOperation({
    summary: 'Listar servidores con acceso',
    description: 'Obtiene todos los servidores que tienen acceso a tu biblioteca',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tokens de acceso',
    type: [AccessTokenResponseDto],
  })
  async getAccessTokens(
    @CurrentUser() user: User,
  ): Promise<AccessTokenResponseDto[]> {
    const tokens = await this.tokenService.getUserAccessTokens(user.id);

    return tokens.map((token) => ({
      id: token.id,
      serverName: token.serverName,
      serverUrl: token.serverUrl ?? undefined,
      permissions: token.permissions,
      isActive: token.isActive,
      lastUsedAt: token.lastUsedAt ?? undefined,
      createdAt: token.createdAt,
    }));
  }

  @Delete('access-tokens/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revocar acceso de servidor',
    description: 'Revoca el acceso de un servidor a tu biblioteca',
  })
  @ApiParam({ name: 'id', description: 'ID del token de acceso' })
  @ApiResponse({ status: 204, description: 'Acceso revocado' })
  @ApiResponse({ status: 404, description: 'Token no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al token' })
  async revokeAccessToken(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    // Verify ownership before revoking
    const accessToken = await this.repository.findFederationAccessTokenById(id);
    if (!accessToken) {
      throw new NotFoundException('Access token not found');
    }
    if (accessToken.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this token');
    }
    await this.tokenService.revokeAccessToken(id);
    this.logger.info({ userId: user.id, tokenId: id }, 'Access token revoked');
  }

  @Patch('access-tokens/:id/permissions')
  @ApiOperation({
    summary: 'Actualizar permisos de un servidor',
    description: 'Actualiza los permisos (browse, stream, download) de un servidor que tiene acceso a tu biblioteca',
  })
  @ApiParam({ name: 'id', description: 'ID del token de acceso' })
  @ApiResponse({
    status: 200,
    description: 'Permisos actualizados',
    type: AccessTokenResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Token no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al token' })
  async updateAccessTokenPermissions(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsDto,
  ): Promise<AccessTokenResponseDto> {
    // Verify ownership before updating
    const accessToken = await this.repository.findFederationAccessTokenById(id);
    if (!accessToken) {
      throw new NotFoundException('Access token not found');
    }
    if (accessToken.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this token');
    }

    // Only include defined values to allow partial updates
    const permissionsToUpdate: Partial<{ canBrowse: boolean; canStream: boolean; canDownload: boolean }> = {};
    if (dto.canBrowse !== undefined) permissionsToUpdate.canBrowse = dto.canBrowse;
    if (dto.canStream !== undefined) permissionsToUpdate.canStream = dto.canStream;
    if (dto.canDownload !== undefined) permissionsToUpdate.canDownload = dto.canDownload;

    const updated = await this.tokenService.updateAccessTokenPermissions(id, permissionsToUpdate);

    if (!updated) {
      throw new NotFoundException('Access token not found');
    }

    this.logger.info(
      { userId: user.id, tokenId: id, permissions: dto },
      'Access token permissions updated',
    );

    return {
      id: updated.id,
      serverName: updated.serverName,
      serverUrl: updated.serverUrl ?? undefined,
      permissions: updated.permissions,
      isActive: updated.isActive,
      lastUsedAt: updated.lastUsedAt ?? undefined,
      createdAt: updated.createdAt,
    };
  }

  // ============================================
  // Mutual Federation (Solicitudes de federación mutua)
  // ============================================

  @Get('access-tokens/pending-mutual')
  @ApiOperation({
    summary: 'Listar solicitudes de federación mutua pendientes',
    description: 'Obtiene los servidores que han solicitado federación mutua',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de servidores con solicitud mutua pendiente',
    type: [AccessTokenResponseDto],
  })
  async getPendingMutualRequests(
    @CurrentUser() user: User,
  ): Promise<AccessTokenResponseDto[]> {
    const tokens = await this.tokenService.getPendingMutualRequests(user.id);
    return tokens.map((token) => ({
      id: token.id,
      serverName: token.serverName,
      serverUrl: token.serverUrl ?? undefined,
      permissions: token.permissions,
      isActive: token.isActive,
      lastUsedAt: token.lastUsedAt ?? undefined,
      createdAt: token.createdAt,
      mutualStatus: token.mutualStatus,
    }));
  }

  @Post('access-tokens/:id/approve-mutual')
  @ApiOperation({
    summary: 'Aprobar solicitud de federación mutua',
    description: 'Aprueba la solicitud y conecta automáticamente al servidor que la solicitó',
  })
  @ApiParam({ name: 'id', description: 'ID del access token' })
  @ApiResponse({
    status: 200,
    description: 'Solicitud aprobada y conectado al servidor',
    type: ConnectedServerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Access token no encontrado o sin solicitud pendiente' })
  @ApiResponse({ status: 403, description: 'Sin acceso al access token' })
  async approveMutualRequest(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ConnectedServerResponseDto> {
    // Get the access token and verify ownership
    const accessToken = await this.tokenService.getAccessTokenById(id);
    if (!accessToken) {
      throw new NotFoundException('Access token not found');
    }
    if (accessToken.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this access token');
    }
    if (accessToken.mutualStatus !== 'pending' || !accessToken.mutualInvitationToken || !accessToken.serverUrl) {
      throw new NotFoundException('No pending mutual request found');
    }

    // Approve the request
    const approved = await this.tokenService.approveMutualRequest(id);
    if (!approved) {
      throw new NotFoundException('Failed to approve mutual request');
    }

    // Connect to the remote server using the invitation token they provided
    const server = await this.remoteServerService.connectToServer(
      user.id,
      accessToken.serverUrl,
      accessToken.mutualInvitationToken,
      accessToken.serverName,
    );

    this.logger.info(
      { userId: user.id, accessTokenId: id, serverUrl: accessToken.serverUrl },
      'Mutual federation request approved and connected',
    );

    return this.mapServerToResponse(server);
  }

  @Post('access-tokens/:id/reject-mutual')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Rechazar solicitud de federación mutua',
    description: 'Rechaza la solicitud de federación mutua (el servidor sigue pudiendo acceder a tu biblioteca)',
  })
  @ApiParam({ name: 'id', description: 'ID del access token' })
  @ApiResponse({ status: 204, description: 'Solicitud rechazada' })
  @ApiResponse({ status: 404, description: 'Access token no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al access token' })
  async rejectMutualRequest(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    // Get the access token and verify ownership
    const accessToken = await this.tokenService.getAccessTokenById(id);
    if (!accessToken) {
      throw new NotFoundException('Access token not found');
    }
    if (accessToken.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this access token');
    }

    await this.tokenService.rejectMutualRequest(id);
    this.logger.info({ userId: user.id, accessTokenId: id }, 'Mutual federation request rejected');
  }

  // ============================================
  // Private helpers
  // ============================================

  private mapServerToResponse(server: any): ConnectedServerResponseDto {
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
