import {
  Controller,
  Get,
  Head,
  Param,
  Query,
  Headers,
  Res,
  HttpStatus,
  StreamableFile,
  UseGuards,
  OnModuleDestroy,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiHeader,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FastifyReply } from 'fastify';
import { StreamTrackUseCase } from '../domain/use-cases';
import { StreamTokenGuard } from './guards';
import { AllowChangePassword } from '@shared/decorators/allow-change-password.decorator';
import { ApiCommonErrors, ApiNotFoundError } from '@shared/decorators';
import * as fs from 'fs';
import { ReadStream } from 'fs';
import { ServerResponse } from 'http';

const STREAM_TIMEOUT_MS = 10 * 60 * 1000;

@ApiTags('streaming')
@Controller('tracks')
@UseGuards(StreamTokenGuard)
@AllowChangePassword()
export class StreamingController implements OnModuleDestroy {
  private readonly activeStreams = new Set<ReadStream>();

  constructor(
    @InjectPinoLogger(StreamingController.name)
    private readonly logger: PinoLogger,
    private readonly streamTrackUseCase: StreamTrackUseCase,
  ) {}

  onModuleDestroy(): void {
    this.logger.info({ activeStreams: this.activeStreams.size }, 'Cleaning up active streams');

    for (const stream of this.activeStreams) {
      if (!stream.destroyed) {
        stream.destroy();
      }
    }

    this.activeStreams.clear();
  }

  private createManagedStream(
    filePath: string,
    trackId: string,
    res: ServerResponse,
    options?: { start?: number; end?: number },
  ): ReadStream {
    const stream = fs.createReadStream(filePath, options);

    this.activeStreams.add(stream);

    const cleanup = (): void => {
      this.activeStreams.delete(stream);
    };

    if (typeof res.setTimeout === 'function') {
      res.setTimeout(STREAM_TIMEOUT_MS, () => {
        this.logger.warn(
          { trackId, ...(options && { start: options.start, end: options.end }) },
          'Stream timeout - client not reading data, closing connection',
        );
        cleanup();
        if (!stream.destroyed) {
          stream.destroy();
        }
        if (!res.destroyed) {
          res.destroy();
        }
      });
    }

    stream.on('error', (error) => {
      cleanup();
      this.logger.error(
        {
          error: error instanceof Error ? error.message : error,
          trackId,
          ...(options && { start: options.start, end: options.end }),
        },
        options ? 'Error reading file (range request)' : 'Error reading file (full stream)',
      );
      if (!res.destroyed) {
        res.destroy();
      }
    });

    res.on('error', (error) => {
      cleanup();
      if ((error as NodeJS.ErrnoException).code !== 'ECONNRESET') {
        this.logger.warn(
          {
            error: error instanceof Error ? error.message : error,
            trackId,
          },
          'Response stream error',
        );
      }
      if (!stream.destroyed) {
        stream.destroy();
      }
    });

    res.on('close', () => {
      cleanup();
      if (!stream.destroyed) {
        stream.destroy();
      }
    });

    stream.on('close', cleanup);
    stream.on('end', cleanup);

    return stream;
  }

  @Head(':id/stream')
  @ApiCommonErrors()
  @ApiNotFoundError('Track')
  @ApiOperation({
    summary: 'Obtener metadata del audio',
    description:
      'Retorna headers con información del archivo (tamaño, tipo MIME) sin enviar el contenido',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del track',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'token',
    type: String,
    description: 'Stream token for authentication',
    required: true,
    example: 'a1b2c3d4e5f6...',
  })
  @ApiResponse({
    status: 200,
    description: 'Metadata obtenida exitosamente',
    headers: {
      'Content-Type': { description: 'MIME type del audio', schema: { type: 'string' } },
      'Content-Length': { description: 'Tamaño del archivo en bytes', schema: { type: 'number' } },
      'Accept-Ranges': { description: 'Soporte de rangos', schema: { type: 'string' } },
    },
  })
  async getStreamMetadata(
    @Param('id', ParseUUIDPipe) trackId: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const metadata = await this.streamTrackUseCase.execute({ trackId });

    res.header('Content-Type', metadata.mimeType);
    res.header('Content-Length', metadata.fileSize.toString());
    res.header('Accept-Ranges', 'bytes');
    res.header('Cache-Control', 'public, max-age=31536000');

    res.status(HttpStatus.OK).send();
  }

  @Get(':id/stream')
  @ApiCommonErrors()
  @ApiNotFoundError('Track')
  @ApiOperation({
    summary: 'Streamear audio',
    description:
      'Retorna el stream de audio. Soporta HTTP Range requests para reproducción parcial (seek/skip)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del track',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'token',
    type: String,
    description: 'Stream token for authentication',
    required: true,
    example: 'a1b2c3d4e5f6...',
  })
  @ApiHeader({
    name: 'Range',
    required: false,
    description: 'Rango de bytes a solicitar (ej: bytes=0-1023)',
    schema: { type: 'string', example: 'bytes=0-1023' },
  })
  @ApiResponse({
    status: 200,
    description: 'Streaming completo del archivo',
  })
  @ApiResponse({
    status: 206,
    description: 'Streaming parcial (Partial Content)',
  })
  @ApiResponse({ status: 416, description: 'Range no satisfacible' })
  async streamTrack(
    @Param('id', ParseUUIDPipe) trackId: string,
    @Headers('range') range: string | undefined,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const metadata = await this.streamTrackUseCase.execute({ trackId, range });
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

      const stream = this.createManagedStream(filePath, trackId, res.raw, { start, end });
      stream.pipe(res.raw);
    } else {
      res.raw.writeHead(HttpStatus.OK, {
        'Content-Type': mimeType,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });

      const stream = this.createManagedStream(filePath, trackId, res.raw);
      stream.pipe(res.raw);
    }
  }

  @Get(':id/download')
  @ApiCommonErrors()
  @ApiNotFoundError('Track')
  @ApiOperation({
    summary: 'Descargar track',
    description: 'Descarga el archivo de audio completo',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del track',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Descarga iniciada exitosamente',
  })
  async downloadTrack(
    @Param('id', ParseUUIDPipe) trackId: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const metadata = await this.streamTrackUseCase.execute({ trackId });
    const { filePath, fileName, fileSize, mimeType } = metadata;

    res.raw.writeHead(HttpStatus.OK, {
      'Content-Type': mimeType,
      'Content-Length': fileSize.toString(),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Cache-Control': 'public, max-age=31536000',
    });

    const stream = this.createManagedStream(filePath, trackId, res.raw);
    stream.pipe(res.raw);
  }
}
