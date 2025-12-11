import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
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
  ApiParam,
} from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '@infrastructure/database/schema';
import { FederationTokenService, RemoteServerService } from '../domain/services';
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
  ) {}

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
  async deleteInvitationToken(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    await this.tokenService.deleteInvitationToken(id);
    this.logger.info({ userId: user.id, tokenId: id }, 'Invitation token deleted');
  }

  // ============================================
  // Connected Servers (Servidores a los que te has conectado)
  // ============================================

  @Post('servers')
  @ApiOperation({
    summary: 'Conectar a servidor',
    description: 'Conectarse a un servidor de un amigo usando su token de invitación',
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
    );

    this.logger.info(
      { userId: user.id, serverId: server.id, serverUrl: dto.serverUrl },
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
    const servers = await this.remoteServerService['repository'].findConnectedServersByUserId(user.id);
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
  async getConnectedServer(
    @Param('id') id: string,
  ): Promise<ConnectedServerResponseDto> {
    const server = await this.remoteServerService['repository'].findConnectedServerById(id);
    if (!server) {
      throw new Error('Server not found');
    }
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
  async syncServer(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ConnectedServerResponseDto> {
    const server = await this.remoteServerService['repository'].findConnectedServerById(id);
    if (!server) {
      throw new Error('Server not found');
    }

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
  async disconnectFromServer(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    await this.remoteServerService.disconnectFromServer(id);
    this.logger.info({ userId: user.id, serverId: id }, 'Disconnected from server');
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
  async getRemoteLibrary(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<RemoteLibraryResponseDto> {
    const server = await this.remoteServerService['repository'].findConnectedServerById(id);
    if (!server) {
      throw new Error('Server not found');
    }

    return this.remoteServerService.getRemoteLibrary(server, query.page, query.limit);
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
  async getRemoteAlbums(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<{ albums: RemoteAlbumDto[]; total: number }> {
    const server = await this.remoteServerService['repository'].findConnectedServerById(id);
    if (!server) {
      throw new Error('Server not found');
    }

    return this.remoteServerService.getRemoteAlbums(
      server,
      query.page,
      query.limit,
      query.search,
    );
  }

  @Get('servers/:id/albums/:albumId')
  @ApiOperation({
    summary: 'Ver álbum de servidor remoto con tracks',
  })
  @ApiParam({ name: 'id', description: 'ID del servidor' })
  @ApiParam({ name: 'albumId', description: 'ID del álbum remoto' })
  async getRemoteAlbum(
    @Param('id') id: string,
    @Param('albumId') albumId: string,
  ) {
    const server = await this.remoteServerService['repository'].findConnectedServerById(id);
    if (!server) {
      throw new Error('Server not found');
    }

    return this.remoteServerService.getRemoteAlbum(server, albumId);
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
  async revokeAccessToken(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    await this.tokenService.revokeAccessToken(id);
    this.logger.info({ userId: user.id, tokenId: id }, 'Access token revoked');
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
