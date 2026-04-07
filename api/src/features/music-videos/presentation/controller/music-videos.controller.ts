import {
  Controller,
  Get,
  Head,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  Res,
  HttpStatus,
  UseGuards,
  OnModuleDestroy,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FastifyReply } from 'fastify';
import { StreamTokenGuard } from '@features/streaming/presentation/guards';
import { AllowChangePassword } from '@shared/decorators/allow-change-password.decorator';
import { Public } from '@shared/decorators/public.decorator';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { appConfig } from '@config/app.config';
import { StreamMusicVideoUseCase } from '../../domain/use-cases/stream-music-video.use-case';
import { GetMusicVideoUseCase } from '../../domain/use-cases/get-music-video.use-case';
import { MusicVideoResponseDto, LinkVideoDto, ListVideosQueryDto } from '../dtos/music-video.dto';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { ReadStream } from 'fs';
import { ServerResponse } from 'http';

const STREAM_TIMEOUT_MS = appConfig.stream_timeout_ms;

@ApiTags('music-videos')
@Controller('music-videos')
@UseGuards(JwtAuthGuard)
export class MusicVideosController implements OnModuleDestroy {
  private readonly activeStreams = new Set<ReadStream>();

  constructor(
    @InjectPinoLogger(MusicVideosController.name)
    private readonly logger: PinoLogger,
    private readonly streamVideoUseCase: StreamMusicVideoUseCase,
    private readonly getVideoUseCase: GetMusicVideoUseCase
  ) {}

  onModuleDestroy(): void {
    for (const stream of this.activeStreams) {
      if (!stream.destroyed) stream.destroy();
    }
    this.activeStreams.clear();
  }

  private createManagedStream(
    filePath: string,
    videoId: string,
    res: ServerResponse,
    options?: { start?: number; end?: number }
  ): ReadStream {
    const stream = fs.createReadStream(filePath, options);
    this.activeStreams.add(stream);

    const cleanup = (): void => {
      this.activeStreams.delete(stream);
    };

    if (typeof res.setTimeout === 'function') {
      res.setTimeout(STREAM_TIMEOUT_MS, () => {
        this.logger.warn({ videoId }, 'Video stream timeout');
        cleanup();
        if (!stream.destroyed) stream.destroy();
        if (!res.destroyed) res.destroy();
      });
    }

    stream.on('error', (error) => {
      cleanup();
      this.logger.error(
        { error: error instanceof Error ? error.message : error, videoId },
        'Error streaming video'
      );
      if (!res.destroyed) res.destroy();
    });

    res.on('close', () => {
      cleanup();
      if (!stream.destroyed) stream.destroy();
    });

    stream.on('close', cleanup);
    stream.on('end', cleanup);

    return stream;
  }

  // ============================================
  // Streaming (protected by stream token)
  // ============================================

  @Head(':id/stream')
  @Public()
  @UseGuards(StreamTokenGuard)
  @AllowChangePassword()
  @ApiOperation({ summary: 'Get video stream metadata' })
  async getStreamMetadata(
    @Param('id', ParseUUIDPipe) videoId: string,
    @Res() res: FastifyReply
  ): Promise<void> {
    const metadata = await this.streamVideoUseCase.execute({ videoId });

    res.header('Content-Type', metadata.mimeType);
    res.header('Content-Length', metadata.fileSize.toString());
    res.header('Accept-Ranges', 'bytes');
    res.header('Cache-Control', 'public, max-age=31536000');
    res.status(HttpStatus.OK).send();
  }

  @Get(':id/stream')
  @Public()
  @UseGuards(StreamTokenGuard)
  @AllowChangePassword()
  @ApiOperation({ summary: 'Stream video file' })
  async streamVideo(
    @Param('id', ParseUUIDPipe) videoId: string,
    @Headers('range') range: string | undefined,
    @Res() res: FastifyReply
  ): Promise<void> {
    const metadata = await this.streamVideoUseCase.execute({ videoId });
    const { filePath, fileSize, mimeType } = metadata;

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

      const stream = this.createManagedStream(filePath, videoId, res.raw, { start, end });
      stream.pipe(res.raw);
    } else {
      res.raw.writeHead(HttpStatus.OK, {
        'Content-Type': mimeType,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });

      const stream = this.createManagedStream(filePath, videoId, res.raw);
      stream.pipe(res.raw);
    }
  }

  // ============================================
  // CRUD (protected by JWT)
  // ============================================

  @Get()
  @ApiOperation({ summary: 'List all music videos' })
  async listVideos(@Query() query: ListVideosQueryDto): Promise<MusicVideoResponseDto[]> {
    const videos = await this.getVideoUseCase.listAll(query.filter, query.limit, query.offset);
    return videos.map((v) => this.toResponseDto(v));
  }

  @Get('by-artist/:artistId')
  @ApiOperation({ summary: 'Get music videos for an artist' })
  async getVideosByArtist(
    @Param('artistId', ParseUUIDPipe) artistId: string
  ): Promise<MusicVideoResponseDto[]> {
    const videos = await this.getVideoUseCase.getByArtistId(artistId);
    return videos.map((v) => this.toResponseDto(v));
  }

  @Get('by-track/:trackId')
  @ApiOperation({ summary: 'Get music video for a track' })
  async getVideoByTrack(
    @Param('trackId', ParseUUIDPipe) trackId: string
  ): Promise<MusicVideoResponseDto | null> {
    const video = await this.getVideoUseCase.getByTrackId(trackId);
    return video ? this.toResponseDto(video) : null;
  }

  @Get(':id/thumbnail')
  @ApiOperation({ summary: 'Get video thumbnail image' })
  async getThumbnail(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: FastifyReply
  ): Promise<void> {
    const video = await this.getVideoUseCase.getById(id);
    if (!video?.thumbnailPath) {
      res.status(HttpStatus.NOT_FOUND).send();
      return;
    }

    // Validate thumbnail path stays within the expected data directory
    const dataPath = process.env.DATA_PATH || '/app/data';
    const resolved = path.resolve(video.thumbnailPath);
    if (!resolved.startsWith(path.resolve(dataPath) + path.sep)) {
      this.logger.error(
        { thumbnailPath: video.thumbnailPath, resolved },
        'Thumbnail path traversal attempt'
      );
      throw new ForbiddenError('Invalid thumbnail path');
    }

    try {
      const buffer = await fsPromises.readFile(resolved);
      res.header('Content-Type', 'image/jpeg');
      res.header('Content-Length', buffer.length.toString());
      res.header('Cache-Control', 'public, max-age=2592000');
      res.send(buffer);
    } catch {
      res.status(HttpStatus.NOT_FOUND).send();
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get music video by ID' })
  async getVideo(@Param('id', ParseUUIDPipe) id: string): Promise<MusicVideoResponseDto> {
    const video = await this.getVideoUseCase.getById(id);
    if (!video) throw new NotFoundError('Music video', id);
    return this.toResponseDto(video);
  }

  @Put(':id/link')
  @ApiOperation({ summary: 'Link video to a track' })
  async linkVideo(
    @Param('id', ParseUUIDPipe) videoId: string,
    @Body() dto: LinkVideoDto
  ): Promise<void> {
    await this.getVideoUseCase.linkToTrack(videoId, dto.trackId);
  }

  @Delete(':id/link')
  @ApiOperation({ summary: 'Unlink video from its track' })
  async unlinkVideo(@Param('id', ParseUUIDPipe) videoId: string): Promise<void> {
    await this.getVideoUseCase.unlinkFromTrack(videoId);
  }

  private toResponseDto(v: {
    id: string;
    trackId: string | null;
    title: string | null;
    artistName: string | null;
    duration: number | null;
    width: number | null;
    height: number | null;
    codec: string | null;
    bitRate: number | null;
    size: number | null;
    suffix: string | null;
    matchMethod: string | null;
    thumbnailPath: string | null;
  }): MusicVideoResponseDto {
    return {
      id: v.id,
      trackId: v.trackId,
      title: v.title,
      artistName: v.artistName,
      duration: v.duration,
      width: v.width,
      height: v.height,
      codec: v.codec,
      bitRate: v.bitRate,
      size: v.size,
      suffix: v.suffix,
      matchMethod: v.matchMethod,
      streamUrl: `/api/music-videos/${v.id}/stream`,
      thumbnailUrl: v.thumbnailPath ? `/api/music-videos/${v.id}/thumbnail` : null,
    };
  }
}
