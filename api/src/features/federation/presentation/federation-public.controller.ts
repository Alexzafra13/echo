import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  Headers,
  UseGuards,
  HttpStatus,
  Req,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FastifyRequest, FastifyReply } from 'fastify';
import { eq, count, or, ilike } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { getAudioMimeType, getImageMimeType } from '@shared/utils/mime-type.util';
import { CoverArtService } from '@shared/services';
import { albums, tracks, artists } from '@infrastructure/database/schema';
import { FederationTokenService } from '../domain/services';
import { FederationAccessGuard } from './guards';
import { RequestWithFederationToken } from '@shared/types/request.types';
import {
  AcceptConnectionDto,
  ConnectionResponseDto,
  ServerInfoResponseDto,
  PaginationQueryDto,
} from './dto';
import { Public } from '@shared/decorators/public.decorator';
import * as fs from 'fs';
import * as path from 'path';

// Endpoints públicos para servidores federados (accedidos con token de acceso)
@ApiTags('federation-public')
@Controller('federation')
export class FederationPublicController {
  constructor(
    @InjectPinoLogger(FederationPublicController.name)
    private readonly logger: PinoLogger,
    private readonly tokenService: FederationTokenService,
    private readonly drizzle: DrizzleService,
    private readonly coverArtService: CoverArtService,
  ) {}

  @Post('connect')
  @Public()
  @ApiOperation({
    summary: 'Conectarse usando token de invitación',
    description: 'Usado por otros servidores para establecer conexión',
  })
  @ApiResponse({
    status: 201,
    description: 'Conexión establecida',
    type: ConnectionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token de invitación inválido' })
  async connect(
    @Body() dto: AcceptConnectionDto,
    @Req() request: FastifyRequest,
  ): Promise<ConnectionResponseDto> {
    const ip = request.ip;

    this.logger.info(
      {
        serverName: dto.serverName,
        serverUrl: dto.serverUrl,
        ip,
        token: dto.invitationToken?.substring(0, 4) + '...',
        requestMutual: dto.requestMutual,
      },
      'Federation connection attempt',
    );

    try {
      // Pass the mutual invitation token if requesting mutual federation
      const mutualToken = dto.requestMutual && dto.serverUrl && dto.mutualInvitationToken
        ? dto.mutualInvitationToken
        : undefined;

      const accessToken = await this.tokenService.useInvitationToken(
        dto.invitationToken,
        dto.serverName,
        dto.serverUrl,
        ip,
        mutualToken,
      );

      if (!accessToken) {
        this.logger.warn(
          { serverName: dto.serverName, token: dto.invitationToken?.substring(0, 4) + '...' },
          'Invalid or expired invitation token',
        );
        throw new UnauthorizedException('Token de invitación inválido o expirado');
      }

      if (mutualToken) {
        this.logger.info(
          { serverName: dto.serverName, serverUrl: dto.serverUrl },
          'Mutual federation requested',
        );
      }

      // Get server stats
      const serverInfo = await this.getServerInfo();

      this.logger.info(
        { serverName: dto.serverName, serverUrl: dto.serverUrl, ip },
        'New server connected via invitation',
      );

      return {
        accessToken: accessToken.token,
        serverInfo,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error), serverName: dto.serverName },
        'Error processing federation connection',
      );
      throw error;
    }
  }

  @Get('ping')
  @UseGuards(FederationAccessGuard)
  @ApiOperation({
    summary: 'Verificar conexión',
    description: 'Verifica que el servidor está disponible y el token es válido',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer {access_token}',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'OK' })
  async ping(): Promise<{ ok: boolean; timestamp: string }> {
    return {
      ok: true,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('info')
  @UseGuards(FederationAccessGuard)
  @ApiOperation({
    summary: 'Obtener información del servidor',
  })
  @ApiResponse({
    status: 200,
    description: 'Información del servidor',
    type: ServerInfoResponseDto,
  })
  async getInfo(): Promise<ServerInfoResponseDto> {
    return this.getServerInfo();
  }

  @Post('disconnect')
  @UseGuards(FederationAccessGuard)
  @ApiOperation({
    summary: 'Notificar desconexión',
    description: 'Notifica que el servidor remoto se está desconectando',
  })
  async disconnect(@Req() request: RequestWithFederationToken): Promise<{ ok: boolean }> {
    const { federationAccessToken } = request;

    // Revoke the access token
    await this.tokenService.revokeAccessToken(federationAccessToken.id);

    this.logger.info(
      { serverName: federationAccessToken.serverName },
      'Server disconnected',
    );

    return { ok: true };
  }

  @Get('library')
  @UseGuards(FederationAccessGuard)
  @ApiOperation({
    summary: 'Obtener biblioteca completa',
    description: 'Retorna la biblioteca con álbums paginados',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLibrary(
    @Query() query: PaginationQueryDto,
    @Req() request: RequestWithFederationToken,
  ) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canBrowse) {
      throw new ForbiddenException('Permiso de navegación no otorgado');
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    // Get albums with artists
    const albumsResult = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        year: albums.year,
        songCount: albums.songCount,
        duration: albums.duration,
        size: albums.size,
        coverArtPath: albums.coverArtPath,
        artistId: artists.id,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.albumArtistId, artists.id))
      .limit(limit)
      .offset(offset);

    // Get totals
    const [albumCount] = await this.drizzle.db
      .select({ count: count() })
      .from(albums);
    const [trackCount] = await this.drizzle.db
      .select({ count: count() })
      .from(tracks);
    const [artistCount] = await this.drizzle.db
      .select({ count: count() })
      .from(artists);

    return {
      albums: albumsResult.map((album) => ({
        id: album.id,
        name: album.name,
        artistName: album.artistName || 'Unknown Artist',
        artistId: album.artistId || '',
        year: album.year,
        songCount: album.songCount,
        duration: album.duration,
        size: album.size,
        coverUrl: album.coverArtPath
          ? `/api/federation/albums/${album.id}/cover`
          : undefined,
      })),
      totalAlbums: Number(albumCount?.count ?? 0),
      totalTracks: Number(trackCount?.count ?? 0),
      totalArtists: Number(artistCount?.count ?? 0),
    };
  }

  @Get('albums')
  @UseGuards(FederationAccessGuard)
  @ApiOperation({
    summary: 'Listar álbums',
  })
  async getAlbums(
    @Query() query: PaginationQueryDto,
    @Req() request: RequestWithFederationToken,
  ) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canBrowse) {
      throw new ForbiddenException('Permiso de navegación no otorgado');
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;
    const search = query.search?.trim();

    // Build search condition if provided
    const searchCondition = search
      ? or(
          ilike(albums.name, `%${search}%`),
          ilike(artists.name, `%${search}%`),
        )
      : undefined;

    // Query albums with optional search filter
    const baseQuery = this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        year: albums.year,
        songCount: albums.songCount,
        duration: albums.duration,
        size: albums.size,
        coverArtPath: albums.coverArtPath,
        artistId: artists.id,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.albumArtistId, artists.id));

    const albumsResult = searchCondition
      ? await baseQuery.where(searchCondition).limit(limit).offset(offset)
      : await baseQuery.limit(limit).offset(offset);

    // Count query with same search filter
    const countBaseQuery = this.drizzle.db
      .select({ count: count() })
      .from(albums)
      .leftJoin(artists, eq(albums.albumArtistId, artists.id));

    const [total] = searchCondition
      ? await countBaseQuery.where(searchCondition)
      : await countBaseQuery;

    return {
      albums: albumsResult.map((album) => ({
        id: album.id,
        name: album.name,
        artistName: album.artistName || 'Unknown Artist',
        artistId: album.artistId || '',
        year: album.year,
        songCount: album.songCount,
        duration: album.duration,
        size: album.size,
        coverUrl: album.coverArtPath
          ? `/api/federation/albums/${album.id}/cover`
          : undefined,
      })),
      total: Number(total?.count ?? 0),
    };
  }

  @Get('albums/:id')
  @UseGuards(FederationAccessGuard)
  @ApiOperation({
    summary: 'Obtener álbum con tracks',
  })
  @ApiParam({ name: 'id', description: 'ID del álbum' })
  async getAlbum(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: RequestWithFederationToken,
  ) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canBrowse) {
      throw new ForbiddenException('Permiso de navegación no otorgado');
    }

    // Get album
    const [album] = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        year: albums.year,
        songCount: albums.songCount,
        duration: albums.duration,
        size: albums.size,
        coverArtPath: albums.coverArtPath,
        artistId: artists.id,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.albumArtistId, artists.id))
      .where(eq(albums.id, id))
      .limit(1);

    if (!album) {
      throw new NotFoundException('Álbum no encontrado');
    }

    // Get tracks
    const albumTracks = await this.drizzle.db
      .select({
        id: tracks.id,
        title: tracks.title,
        trackNumber: tracks.trackNumber,
        discNumber: tracks.discNumber,
        duration: tracks.duration,
        size: tracks.size,
        bitRate: tracks.bitRate,
        artistId: artists.id,
        artistName: artists.name,
      })
      .from(tracks)
      .leftJoin(artists, eq(tracks.artistId, artists.id))
      .where(eq(tracks.albumId, id))
      .orderBy(tracks.discNumber, tracks.trackNumber);

    return {
      id: album.id,
      name: album.name,
      artistName: album.artistName || 'Unknown Artist',
      artistId: album.artistId || '',
      year: album.year,
      songCount: album.songCount,
      duration: album.duration,
      size: album.size,
      coverUrl: album.coverArtPath
        ? `/api/federation/albums/${album.id}/cover`
        : undefined,
      tracks: albumTracks.map((track) => ({
        id: track.id,
        title: track.title,
        artistName: track.artistName || 'Unknown Artist',
        artistId: track.artistId || '',
        albumName: album.name,
        albumId: album.id,
        trackNumber: track.trackNumber,
        discNumber: track.discNumber,
        duration: track.duration,
        size: track.size,
        bitRate: track.bitRate,
      })),
    };
  }

  @Get('albums/:id/cover')
  @UseGuards(FederationAccessGuard)
  @ApiOperation({
    summary: 'Obtener carátula de álbum',
  })
  @ApiParam({ name: 'id', description: 'ID del álbum' })
  async getAlbumCover(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: FastifyReply,
    @Req() request: RequestWithFederationToken,
  ) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canBrowse) {
      res.status(HttpStatus.FORBIDDEN).send({ error: 'Browse permission not granted' });
      return;
    }

    const [album] = await this.drizzle.db
      .select({ coverArtPath: albums.coverArtPath })
      .from(albums)
      .where(eq(albums.id, id))
      .limit(1);

    if (!album?.coverArtPath) {
      res.status(HttpStatus.NOT_FOUND).send({ error: 'Cover not found' });
      return;
    }

    // Use CoverArtService to get the full path from the cached cover filename
    const coverPath = this.coverArtService.getCoverPath(album.coverArtPath);
    if (!coverPath) {
      res.status(HttpStatus.NOT_FOUND).send({ error: 'Cover file not found' });
      return;
    }

    const stream = fs.createReadStream(coverPath);
    const mimeType = getImageMimeType(path.extname(coverPath));
    res.header('Content-Type', mimeType);
    res.header('Cache-Control', 'public, max-age=86400');
    res.send(stream);
  }

  @Get('stream/:trackId')
  @UseGuards(FederationAccessGuard)
  @ApiOperation({
    summary: 'Stream de track',
    description: 'Hace streaming de un track para reproducción',
  })
  @ApiParam({ name: 'trackId', description: 'ID del track' })
  async streamTrack(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Headers('range') range: string | undefined,
    @Res() res: FastifyReply,
    @Req() request: RequestWithFederationToken,
  ) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canStream) {
      res.status(HttpStatus.FORBIDDEN).send({ error: 'Stream permission not granted' });
      return;
    }

    // Get track
    const [track] = await this.drizzle.db
      .select({ path: tracks.path, size: tracks.size })
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .limit(1);

    if (!track || !fs.existsSync(track.path)) {
      res.status(HttpStatus.NOT_FOUND).send({ error: 'Track not found' });
      return;
    }

    const fileSize = track.size ?? fs.statSync(track.path).size;
    const mimeType = getAudioMimeType(path.extname(track.path));

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
        res.header('Content-Range', `bytes */${fileSize}`);
        res.send();
        return;
      }

      const chunkSize = end - start + 1;

      res.raw.writeHead(HttpStatus.PARTIAL_CONTENT, {
        'Content-Type': mimeType,
        'Content-Length': chunkSize.toString(),
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });

      const stream = fs.createReadStream(track.path, { start, end });
      stream.pipe(res.raw);
    } else {
      res.raw.writeHead(HttpStatus.OK, {
        'Content-Type': mimeType,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });

      const stream = fs.createReadStream(track.path);
      stream.pipe(res.raw);
    }
  }

  @Get('albums/:id/export')
  @UseGuards(FederationAccessGuard)
  @ApiOperation({
    summary: 'Exportar metadatos completos del álbum',
    description: 'Retorna todos los metadatos del álbum incluyendo LUFS, ReplayGain, MusicBrainz IDs para importación',
  })
  @ApiParam({ name: 'id', description: 'ID del álbum' })
  async exportAlbumMetadata(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: RequestWithFederationToken,
  ) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canDownload) {
      throw new ForbiddenException('Permiso de descarga no otorgado');
    }

    // Get album with all metadata
    const [album] = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        year: albums.year,
        releaseDate: albums.releaseDate,
        originalDate: albums.originalDate,
        compilation: albums.compilation,
        songCount: albums.songCount,
        duration: albums.duration,
        size: albums.size,
        coverArtPath: albums.coverArtPath,
        mbzAlbumId: albums.mbzAlbumId,
        mbzAlbumArtistId: albums.mbzAlbumArtistId,
        mbzAlbumType: albums.mbzAlbumType,
        catalogNum: albums.catalogNum,
        comment: albums.comment,
        description: albums.description,
        artistId: artists.id,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.albumArtistId, artists.id))
      .where(eq(albums.id, id))
      .limit(1);

    if (!album) {
      throw new NotFoundException('Álbum no encontrado');
    }

    // Get tracks with ALL metadata including LUFS/ReplayGain
    const albumTracks = await this.drizzle.db
      .select({
        id: tracks.id,
        title: tracks.title,
        trackNumber: tracks.trackNumber,
        discNumber: tracks.discNumber,
        discSubtitle: tracks.discSubtitle,
        duration: tracks.duration,
        size: tracks.size,
        bitRate: tracks.bitRate,
        channels: tracks.channels,
        suffix: tracks.suffix,
        year: tracks.year,
        date: tracks.date,
        originalDate: tracks.originalDate,
        releaseDate: tracks.releaseDate,
        artistName: tracks.artistName,
        albumArtistName: tracks.albumArtistName,
        comment: tracks.comment,
        lyrics: tracks.lyrics,
        bpm: tracks.bpm,
        // ReplayGain data
        rgAlbumGain: tracks.rgAlbumGain,
        rgAlbumPeak: tracks.rgAlbumPeak,
        rgTrackGain: tracks.rgTrackGain,
        rgTrackPeak: tracks.rgTrackPeak,
        // LUFS analyzed flag
        lufsAnalyzedAt: tracks.lufsAnalyzedAt,
        // MusicBrainz IDs
        mbzTrackId: tracks.mbzTrackId,
        mbzAlbumId: tracks.mbzAlbumId,
        mbzArtistId: tracks.mbzArtistId,
        mbzAlbumArtistId: tracks.mbzAlbumArtistId,
        mbzReleaseTrackId: tracks.mbzReleaseTrackId,
        catalogNum: tracks.catalogNum,
        // File info
        path: tracks.path,
      })
      .from(tracks)
      .where(eq(tracks.albumId, id))
      .orderBy(tracks.discNumber, tracks.trackNumber);

    return {
      album: {
        id: album.id,
        name: album.name,
        artistName: album.artistName || 'Unknown Artist',
        artistId: album.artistId,
        year: album.year,
        releaseDate: album.releaseDate,
        originalDate: album.originalDate,
        compilation: album.compilation,
        songCount: album.songCount,
        duration: album.duration,
        size: album.size,
        hasCover: !!album.coverArtPath,
        coverUrl: album.coverArtPath ? `/api/federation/albums/${album.id}/cover` : null,
        // MusicBrainz
        mbzAlbumId: album.mbzAlbumId,
        mbzAlbumArtistId: album.mbzAlbumArtistId,
        mbzAlbumType: album.mbzAlbumType,
        catalogNum: album.catalogNum,
        comment: album.comment,
        description: album.description,
      },
      tracks: albumTracks.map((t) => ({
        id: t.id,
        title: t.title,
        trackNumber: t.trackNumber,
        discNumber: t.discNumber,
        discSubtitle: t.discSubtitle,
        duration: t.duration,
        size: t.size,
        bitRate: t.bitRate,
        channels: t.channels,
        suffix: t.suffix,
        year: t.year,
        date: t.date,
        originalDate: t.originalDate,
        releaseDate: t.releaseDate,
        artistName: t.artistName,
        albumArtistName: t.albumArtistName,
        comment: t.comment,
        lyrics: t.lyrics,
        bpm: t.bpm,
        // ReplayGain/LUFS - the key data for normalization
        rgAlbumGain: t.rgAlbumGain,
        rgAlbumPeak: t.rgAlbumPeak,
        rgTrackGain: t.rgTrackGain,
        rgTrackPeak: t.rgTrackPeak,
        lufsAnalyzed: !!t.lufsAnalyzedAt,
        // MusicBrainz
        mbzTrackId: t.mbzTrackId,
        mbzAlbumId: t.mbzAlbumId,
        mbzArtistId: t.mbzArtistId,
        mbzAlbumArtistId: t.mbzAlbumArtistId,
        mbzReleaseTrackId: t.mbzReleaseTrackId,
        catalogNum: t.catalogNum,
        // File info for download
        filename: t.path.split('/').pop(),
        streamUrl: `/api/federation/stream/${t.id}`,
      })),
    };
  }

  @Get('albums/:id/download')
  @UseGuards(FederationAccessGuard)
  @ApiOperation({
    summary: 'Descargar álbum completo',
    description: 'Descarga un álbum completo como ZIP',
  })
  @ApiParam({ name: 'id', description: 'ID del álbum' })
  async downloadAlbum(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: FastifyReply,
    @Req() request: RequestWithFederationToken,
  ) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canDownload) {
      res.status(HttpStatus.FORBIDDEN).send({ error: 'Download permission not granted' });
      return;
    }

    // Get album with tracks
    const [album] = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        coverArtPath: albums.coverArtPath,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.albumArtistId, artists.id))
      .where(eq(albums.id, id))
      .limit(1);

    if (!album) {
      res.status(HttpStatus.NOT_FOUND).send({ error: 'Album not found' });
      return;
    }

    const albumTracks = await this.drizzle.db
      .select({
        id: tracks.id,
        title: tracks.title,
        path: tracks.path,
        trackNumber: tracks.trackNumber,
        discNumber: tracks.discNumber,
      })
      .from(tracks)
      .where(eq(tracks.albumId, id))
      .orderBy(tracks.discNumber, tracks.trackNumber);

    // Create JSON metadata
    const metadata = {
      album: {
        id: album.id,
        name: album.name,
        artistName: album.artistName,
      },
      tracks: albumTracks.map((t) => ({
        id: t.id,
        title: t.title,
        trackNumber: t.trackNumber,
        discNumber: t.discNumber,
        filename: t.path.split('/').pop(),
      })),
    };

    // For now, just return metadata with download URLs
    // A full implementation would stream a ZIP file
    res.header('Content-Type', 'application/json');
    res.send({
      metadata,
      downloadUrls: {
        cover: album.coverArtPath
          ? `/api/federation/albums/${album.id}/cover`
          : null,
        tracks: albumTracks.map((t) => ({
          id: t.id,
          url: `/api/federation/stream/${t.id}`,
        })),
      },
    });
  }

  private async getServerInfo(): Promise<ServerInfoResponseDto> {
    const [albumCount] = await this.drizzle.db
      .select({ count: count() })
      .from(albums);
    const [trackCount] = await this.drizzle.db
      .select({ count: count() })
      .from(tracks);
    const [artistCount] = await this.drizzle.db
      .select({ count: count() })
      .from(artists);

    return {
      name: 'Echo Music Server',
      version: '1.0.0',
      albumCount: Number(albumCount?.count ?? 0),
      trackCount: Number(trackCount?.count ?? 0),
      artistCount: Number(artistCount?.count ?? 0),
    };
  }

}
