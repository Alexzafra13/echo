import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  Inject,
  ParseUUIDPipe,
} from '@nestjs/common';
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
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '@infrastructure/database/schema';
import { FederationTokenService } from '../domain/services';
import { RemoteServerService } from '../infrastructure/services';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../domain/ports/federation.repository';
import {
  UpdatePermissionsDto,
  AccessTokenResponseDto,
  ConnectedServerResponseDto,
} from './dto';

// Gestión de tokens de acceso y federación mutua entre servidores
@ApiTags('federation')
@Controller('federation/access-tokens')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccessTokenController {
  constructor(
    @InjectPinoLogger(AccessTokenController.name)
    private readonly logger: PinoLogger,
    private readonly tokenService: FederationTokenService,
    private readonly remoteServerService: RemoteServerService,
    @Inject(FEDERATION_REPOSITORY)
    private readonly repository: IFederationRepository,
  ) {}

  @Get()
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revocar o eliminar acceso de servidor',
    description: 'Revoca el acceso de un servidor a tu biblioteca. Con ?permanent=true elimina permanentemente.',
  })
  @ApiParam({ name: 'id', description: 'ID del token de acceso' })
  @ApiQuery({ name: 'permanent', required: false, description: 'Si es true, elimina permanentemente el token' })
  @ApiResponse({ status: 204, description: 'Acceso revocado/eliminado' })
  @ApiResponse({ status: 404, description: 'Token no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al token' })
  async revokeOrDeleteAccessToken(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('permanent') permanent?: string,
  ): Promise<void> {
    const accessToken = await this.repository.findFederationAccessTokenById(id);
    if (!accessToken) {
      throw new NotFoundException('Access token not found');
    }
    if (accessToken.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this token');
    }

    if (permanent === 'true') {
      await this.tokenService.deleteAccessToken(id);
      this.logger.info({ userId: user.id, tokenId: id }, 'Access token permanently deleted');
    } else {
      await this.tokenService.revokeAccessToken(id);
      this.logger.info({ userId: user.id, tokenId: id }, 'Access token revoked');
    }
  }

  @Post(':id/reactivate')
  @ApiOperation({
    summary: 'Reactivar acceso de servidor',
    description: 'Reactiva el acceso de un servidor que fue revocado previamente',
  })
  @ApiParam({ name: 'id', description: 'ID del token de acceso' })
  @ApiResponse({
    status: 200,
    description: 'Acceso reactivado',
    type: AccessTokenResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Token no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al token' })
  async reactivateAccessToken(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AccessTokenResponseDto> {
    const accessToken = await this.repository.findFederationAccessTokenById(id);
    if (!accessToken) {
      throw new NotFoundException('Access token not found');
    }
    if (accessToken.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this token');
    }

    const updated = await this.tokenService.reactivateAccessToken(id);
    if (!updated) {
      throw new NotFoundException('Access token not found');
    }

    this.logger.info({ userId: user.id, tokenId: id }, 'Access token reactivated');

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

  @Patch(':id/permissions')
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
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionsDto,
  ): Promise<AccessTokenResponseDto> {
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

  @Get('pending-mutual')
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

  @Post(':id/approve-mutual')
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
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConnectedServerResponseDto> {
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

  @Post(':id/reject-mutual')
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
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
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
}
