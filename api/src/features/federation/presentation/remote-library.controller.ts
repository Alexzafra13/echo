import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Headers,
  UseGuards,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  Inject,
  ParseUUIDPipe,
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
import { User } from '@infrastructure/database/schema';
import { ConnectedServer } from '../domain/types';
import { RemoteServerService } from '../infrastructure/services';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../domain/ports/federation.repository';
import { StreamTokenService } from '@features/streaming/infrastructure/services/stream-token.service';
import {
  PaginationQueryDto,
  RemoteLibraryResponseDto,
  RemoteAlbumDto,
  SharedAlbumsResponseDto,
  SharedLibrariesQueryDto,
} from './dto';

// Navegación y streaming de bibliotecas remotas de servidores federados
@ApiTags('federation')
@Controller('federation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RemoteLibraryController {
  constructor(
    @InjectPinoLogger(RemoteLibraryController.name)
    private readonly logger: PinoLogger,
    private readonly remoteServerService: RemoteServerService,
    @Inject(FEDERATION_REPOSITORY)
    private readonly repository: IFederationRepository,
    private readonly streamTokenService: StreamTokenService,
  ) {}

  private async getServerWithOwnershipCheck(
    serverId: string,
    userId: string,
  ): Promise<ConnectedServer> {
    const server = await this.repository.findConnectedServerById(serverId);
    if (!server) {
      throw new NotFoundException('Servidor no encontrado');
    }
    if (server.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este servidor');
    }
    return server;
  }

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

    const requestedLimit = query.limit || 20;
    const searchTerm = query.search?.trim().toLowerCase();

    // If searching, request more albums to filter locally (fallback for servers without search)
    const fetchLimit = searchTerm ? Math.max(requestedLimit * 5, 100) : requestedLimit;

    // Fetch albums from each server in parallel
    const results = await Promise.allSettled(
      targetServers.map(async (server) => {
        try {
          const result = await this.remoteServerService.getRemoteAlbums(
            server,
            searchTerm ? 1 : (query.page || 1), // Always fetch from page 1 when searching
            fetchLimit,
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
    let allAlbums: SharedAlbumsResponseDto['albums'] = [];
    let successfulServers = 0;

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.albums.length > 0) {
        successfulServers++;
        for (const album of result.value.albums) {
          allAlbums.push({
            ...this.transformAlbumCoverUrl(album, result.value.server.id),
            serverId: result.value.server.id,
            serverName: result.value.server.name,
          });
        }
      }
    }

    // Apply local search filter as fallback (for servers that don't support search)
    if (searchTerm) {
      allAlbums = allAlbums.filter(album =>
        album.name.toLowerCase().includes(searchTerm) ||
        album.artistName.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by name
    allAlbums.sort((a, b) => a.name.localeCompare(b.name));

    // Apply pagination
    const page = query.page || 1;
    const startIndex = (page - 1) * requestedLimit;
    const paginatedAlbums = allAlbums.slice(startIndex, startIndex + requestedLimit);

    return {
      albums: paginatedAlbums,
      total: allAlbums.length,
      totalPages: Math.ceil(allAlbums.length / requestedLimit),
      serverCount: successfulServers,
    };
  }

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
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<RemoteLibraryResponseDto> {
    const server = await this.getServerWithOwnershipCheck(id, user.id);
    const library = await this.remoteServerService.getRemoteLibrary(server, query.page, query.limit);
    return {
      ...library,
      albums: this.transformAlbumsCoverUrls(library.albums, id),
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
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<{ albums: RemoteAlbumDto[]; total: number }> {
    const server = await this.getServerWithOwnershipCheck(id, user.id);
    const result = await this.remoteServerService.getRemoteAlbums(
      server,
      query.page,
      query.limit,
      query.search,
    );
    return {
      ...result,
      albums: this.transformAlbumsCoverUrls(result.albums, id),
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
    @Param('id', ParseUUIDPipe) id: string,
    @Param('albumId', ParseUUIDPipe) albumId: string,
  ) {
    const server = await this.getServerWithOwnershipCheck(id, user.id);
    const album = await this.remoteServerService.getRemoteAlbum(server, albumId);
    return this.transformAlbumCoverUrl(album, id);
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
    @Param('id', ParseUUIDPipe) id: string,
    @Param('albumId', ParseUUIDPipe) albumId: string,
    @Res() res: FastifyReply,
  ) {
    // Get server directly (endpoint is public, covers are not sensitive data)
    const server = await this.repository.findConnectedServerById(id);
    if (!server) {
      res.status(HttpStatus.NOT_FOUND).send({ error: 'Servidor no encontrado' });
      return;
    }

    const cover = await this.remoteServerService.getRemoteAlbumCover(server, albumId);

    if (!cover) {
      res.status(HttpStatus.NOT_FOUND).send({ error: 'Carátula no encontrada' });
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
    @Param('id', ParseUUIDPipe) id: string,
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Query('token') token: string | undefined,
    @Headers('range') range: string | undefined,
    @Res() res: FastifyReply,
  ) {
    // Validate stream token
    if (!token) {
      res.status(HttpStatus.UNAUTHORIZED).send({ error: 'Token de streaming requerido' });
      return;
    }

    const userId = await this.streamTokenService.validateToken(token);
    if (!userId) {
      res.status(HttpStatus.UNAUTHORIZED).send({ error: 'Token de streaming inválido o expirado' });
      return;
    }

    // Get server and verify ownership
    const server = await this.repository.findConnectedServerById(id);
    if (!server) {
      res.status(HttpStatus.NOT_FOUND).send({ error: 'Servidor no encontrado' });
      return;
    }
    if (server.userId !== userId) {
      res.status(HttpStatus.FORBIDDEN).send({ error: 'No tienes acceso a este servidor' });
      return;
    }

    try {
      const streamResult = await this.remoteServerService.streamRemoteTrack(
        server,
        trackId,
        range,
      );

      if (!streamResult) {
        res.status(HttpStatus.NOT_FOUND).send({ error: 'Track no encontrado' });
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
      res.status(HttpStatus.BAD_GATEWAY).send({ error: 'Error al hacer streaming desde servidor remoto' });
    }
  }

  // Transforma coverUrl remota a proxy local
  private transformAlbumCoverUrl<T extends { id: string; coverUrl?: string }>(
    album: T,
    serverId: string,
  ): T & { coverUrl?: string } {
    return {
      ...album,
      coverUrl: album.coverUrl
        ? `/api/federation/servers/${serverId}/albums/${album.id}/cover`
        : undefined,
    };
  }

  private transformAlbumsCoverUrls<T extends { id: string; coverUrl?: string }>(
    albums: T[],
    serverId: string,
  ): (T & { coverUrl?: string })[] {
    return albums.map((album) => this.transformAlbumCoverUrl(album, serverId));
  }
}
