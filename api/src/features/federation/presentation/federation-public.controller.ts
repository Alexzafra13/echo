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
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FastifyRequest, FastifyReply } from 'fastify';
import { getAudioMimeType, getImageMimeType } from '@shared/utils/mime-type.util';
import { CoverArtService } from '@shared/services';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { CAMELOT_COLORS } from '@features/dj/config/dj.config';
import { FederationTokenService } from '../domain/services';
import { IFederationLibraryRepository, FEDERATION_LIBRARY_REPOSITORY } from '../domain/ports';
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
    @Inject(FEDERATION_LIBRARY_REPOSITORY)
    private readonly libraryRepo: IFederationLibraryRepository,
    private readonly coverArtService: CoverArtService,
    private readonly settingsService: SettingsService
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
    @Req() request: FastifyRequest
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
      'Federation connection attempt'
    );

    try {
      // Pass the mutual invitation token if requesting mutual federation
      const mutualToken =
        dto.requestMutual && dto.serverUrl && dto.mutualInvitationToken
          ? dto.mutualInvitationToken
          : undefined;

      const accessToken = await this.tokenService.useInvitationToken(
        dto.invitationToken,
        dto.serverName,
        dto.serverUrl,
        ip,
        mutualToken
      );

      if (!accessToken) {
        this.logger.warn(
          { serverName: dto.serverName, token: dto.invitationToken?.substring(0, 4) + '...' },
          'Invalid or expired invitation token'
        );
        throw new UnauthorizedException('Token de invitación inválido o expirado');
      }

      if (mutualToken) {
        this.logger.info(
          { serverName: dto.serverName, serverUrl: dto.serverUrl },
          'Mutual federation requested'
        );
      }

      // Get server stats
      const serverInfo = await this.getServerInfo();

      this.logger.info(
        { serverName: dto.serverName, serverUrl: dto.serverUrl, ip },
        'New server connected via invitation'
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
        {
          error: error instanceof Error ? error.message : String(error),
          serverName: dto.serverName,
        },
        'Error processing federation connection'
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

    this.logger.info({ serverName: federationAccessToken.serverName }, 'Server disconnected');

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
  async getLibrary(@Query() query: PaginationQueryDto, @Req() request: RequestWithFederationToken) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canBrowse) {
      throw new ForbiddenException('Permiso de navegación no otorgado');
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    const [{ albums: albumsResult }, counts] = await Promise.all([
      this.libraryRepo.findAlbums({ limit, offset }),
      this.libraryRepo.getCounts(),
    ]);

    return {
      albums: this.mapAlbums(albumsResult),
      totalAlbums: counts.albumCount,
      totalTracks: counts.trackCount,
      totalArtists: counts.artistCount,
    };
  }

  @Get('albums')
  @UseGuards(FederationAccessGuard)
  @ApiOperation({
    summary: 'Listar álbums',
  })
  async getAlbums(@Query() query: PaginationQueryDto, @Req() request: RequestWithFederationToken) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canBrowse) {
      throw new ForbiddenException('Permiso de navegación no otorgado');
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;
    const search = query.search?.trim();

    const result = await this.libraryRepo.findAlbums({ limit, offset, search });

    return {
      albums: this.mapAlbums(result.albums),
      total: result.total,
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
    @Req() request: RequestWithFederationToken
  ) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canBrowse) {
      throw new ForbiddenException('Permiso de navegación no otorgado');
    }

    const album = await this.libraryRepo.findAlbumById(id);
    if (!album) {
      throw new NotFoundException('Álbum no encontrado');
    }

    const albumTracks = await this.libraryRepo.findAlbumTracks(id);

    return {
      ...this.mapAlbum(album),
      tracks: albumTracks.map((track) => {
        const camelotColor = track.djCamelotKey ? CAMELOT_COLORS[track.djCamelotKey] || null : null;

        return {
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
          format: track.suffix,
          rgTrackGain: track.rgTrackGain,
          rgTrackPeak: track.rgTrackPeak,
          rgAlbumGain: track.rgAlbumGain,
          rgAlbumPeak: track.rgAlbumPeak,
          bpm: track.bpm,
          initialKey: track.initialKey,
          outroStart: track.outroStart,
          lufsAnalyzed: !!track.lufsAnalyzedAt,
          djAnalysis: track.djStatus
            ? {
                status: track.djStatus,
                bpm: track.djBpm,
                key: track.djKey,
                camelotKey: track.djCamelotKey,
                camelotColor: camelotColor
                  ? { bg: camelotColor.bg, text: camelotColor.text, name: camelotColor.name }
                  : undefined,
                energy: track.djEnergy,
                danceability: track.djDanceability,
                analysisError: track.djAnalysisError,
                analyzedAt: track.djAnalyzedAt?.toISOString(),
              }
            : undefined,
        };
      }),
    };
  }

  @Get('albums/:id/dj-analysis')
  @UseGuards(FederationAccessGuard)
  @ApiOperation({
    summary: 'Obtener análisis DJ de tracks del álbum',
    description:
      'Retorna datos de análisis DJ (BPM, key, energía, bailabilidad) para todos los tracks del álbum',
  })
  @ApiParam({ name: 'id', description: 'ID del álbum' })
  async getAlbumDjAnalysis(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: RequestWithFederationToken
  ) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canBrowse) {
      throw new ForbiddenException('Browse permission not granted');
    }

    const albumTracks = await this.libraryRepo.findAlbumDjAnalysis(id);

    return {
      tracks: albumTracks.map((t) => {
        const camelotColor = t.camelotKey ? CAMELOT_COLORS[t.camelotKey] : undefined;
        return {
          trackId: t.trackId,
          status: t.status,
          bpm: t.bpm,
          key: t.key,
          camelotKey: t.camelotKey,
          camelotColor: camelotColor
            ? { bg: camelotColor.bg, text: camelotColor.text, name: camelotColor.name }
            : undefined,
          energy: t.energy,
          danceability: t.danceability,
          analysisError: t.analysisError,
          analyzedAt: t.analyzedAt?.toISOString(),
        };
      }),
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
    @Req() request: RequestWithFederationToken
  ) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canBrowse) {
      res.status(HttpStatus.FORBIDDEN).send({ error: 'Browse permission not granted' });
      return;
    }

    const coverArtPath = await this.libraryRepo.findAlbumCoverPath(id);

    if (!coverArtPath) {
      res.status(HttpStatus.NOT_FOUND).send({ error: 'Cover not found' });
      return;
    }

    const coverPath = this.coverArtService.getCoverPath(coverArtPath);
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
    @Req() request: RequestWithFederationToken
  ) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canStream) {
      res.status(HttpStatus.FORBIDDEN).send({ error: 'Stream permission not granted' });
      return;
    }

    const track = await this.libraryRepo.findTrackPath(trackId);

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
    description:
      'Retorna todos los metadatos del álbum incluyendo LUFS, ReplayGain, MusicBrainz IDs para importación',
  })
  @ApiParam({ name: 'id', description: 'ID del álbum' })
  async exportAlbumMetadata(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: RequestWithFederationToken
  ) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canDownload) {
      throw new ForbiddenException('Permiso de descarga no otorgado');
    }

    const album = await this.libraryRepo.findAlbumForExport(id);
    if (!album) {
      throw new NotFoundException('Álbum no encontrado');
    }

    const albumTracks = await this.libraryRepo.findAlbumTracksForExport(id);

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
        rgAlbumGain: t.rgAlbumGain,
        rgAlbumPeak: t.rgAlbumPeak,
        rgTrackGain: t.rgTrackGain,
        rgTrackPeak: t.rgTrackPeak,
        lufsAnalyzed: !!t.lufsAnalyzedAt,
        mbzTrackId: t.mbzTrackId,
        mbzAlbumId: t.mbzAlbumId,
        mbzArtistId: t.mbzArtistId,
        mbzAlbumArtistId: t.mbzAlbumArtistId,
        mbzReleaseTrackId: t.mbzReleaseTrackId,
        catalogNum: t.catalogNum,
        djAnalysis: t.djStatus
          ? (() => {
              const camelotColor = t.djCamelotKey ? CAMELOT_COLORS[t.djCamelotKey] : undefined;
              return {
                status: t.djStatus,
                bpm: t.djBpm,
                key: t.djKey,
                camelotKey: t.djCamelotKey,
                camelotColor: camelotColor
                  ? { bg: camelotColor.bg, text: camelotColor.text, name: camelotColor.name }
                  : undefined,
                energy: t.djEnergy,
                danceability: t.djDanceability,
                analysisError: t.djAnalysisError,
                analyzedAt: t.djAnalyzedAt?.toISOString(),
              };
            })()
          : undefined,
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
    @Req() request: RequestWithFederationToken
  ) {
    const { federationAccessToken } = request;

    if (!federationAccessToken.permissions.canDownload) {
      res.status(HttpStatus.FORBIDDEN).send({ error: 'Download permission not granted' });
      return;
    }

    const album = await this.libraryRepo.findAlbumForDownload(id);
    if (!album) {
      res.status(HttpStatus.NOT_FOUND).send({ error: 'Album not found' });
      return;
    }

    const albumTracks = await this.libraryRepo.findAlbumTrackPaths(id);

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

    res.header('Content-Type', 'application/json');
    res.send({
      metadata,
      downloadUrls: {
        cover: album.coverArtPath ? `/api/federation/albums/${album.id}/cover` : null,
        tracks: albumTracks.map((t) => ({
          id: t.id,
          url: `/api/federation/stream/${t.id}`,
        })),
      },
    });
  }

  private mapAlbum(album: {
    id: string;
    name: string;
    artistName: string | null;
    artistId: string | null;
    year: number | null;
    songCount: number | null;
    duration: number | null;
    size: number | null;
    coverArtPath: string | null;
  }) {
    return {
      id: album.id,
      name: album.name,
      artistName: album.artistName || 'Unknown Artist',
      artistId: album.artistId || '',
      year: album.year,
      songCount: album.songCount,
      duration: album.duration,
      size: album.size,
      coverUrl: album.coverArtPath ? `/api/federation/albums/${album.id}/cover` : undefined,
    };
  }

  private mapAlbums(
    albumsList: Array<{
      id: string;
      name: string;
      artistName: string | null;
      artistId: string | null;
      year: number | null;
      songCount: number | null;
      duration: number | null;
      size: number | null;
      coverArtPath: string | null;
    }>
  ) {
    return albumsList.map((album) => this.mapAlbum(album));
  }

  private async getServerInfo(): Promise<ServerInfoResponseDto> {
    const counts = await this.libraryRepo.getCounts();

    let serverName = await this.settingsService.getString('server.name', '');
    if (!serverName) {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      serverName = `Echo Server #${randomId}`;
      await this.settingsService.set('server.name', serverName);
    }

    const serverColor = await this.settingsService.getString('server.color', '');

    return {
      name: serverName,
      version: '1.0.0',
      color: serverColor || undefined,
      albumCount: counts.albumCount,
      trackCount: counts.trackCount,
      artistCount: counts.artistCount,
    };
  }
}
