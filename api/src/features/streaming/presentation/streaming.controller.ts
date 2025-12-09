import {
  Controller,
  Get,
  Head,
  Param,
  Headers,
  Res,
  HttpStatus,
  StreamableFile,
  UseGuards,
  OnModuleDestroy,
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
import { StreamTokenGuard } from '../domain/stream-token.guard';
import { AllowChangePassword } from '@shared/decorators/allow-change-password.decorator';
import * as fs from 'fs';
import { ReadStream } from 'fs';

/**
 * StreamingController - Controlador de streaming de audio
 *
 * Responsabilidades:
 * - Streamear archivos de audio con soporte para HTTP Range requests
 * - Proporcionar metadata de archivos (HEAD)
 * - Manejar descarga completa de archivos
 *
 * Autenticación: Usa StreamTokenGuard que valida tokens de streaming
 * en query parameters (requerido para HTML5 audio element)
 *
 * MustChangePasswordGuard: Excluido vía @AllowChangePassword para permitir streaming
 * incluso cuando el usuario debe cambiar su contraseña
 */
@ApiTags('streaming')
@Controller('tracks')
@UseGuards(StreamTokenGuard)
@AllowChangePassword() // Permitir streaming aunque usuario deba cambiar contraseña
export class StreamingController implements OnModuleDestroy {
  private readonly activeStreams = new Set<ReadStream>();

  constructor(
    @InjectPinoLogger(StreamingController.name)
    private readonly logger: PinoLogger,
    private readonly streamTrackUseCase: StreamTrackUseCase,
  ) {}

  /**
   * Cleanup: Destruir todos los streams activos al cerrar el módulo
   */
  onModuleDestroy() {
    this.logger.info({ activeStreams: this.activeStreams.size }, 'Cleaning up active streams');

    for (const stream of this.activeStreams) {
      if (!stream.destroyed) {
        stream.destroy();
      }
    }

    this.activeStreams.clear();
  }

  /**
   * HEAD /tracks/:id/stream
   * Obtener metadata del archivo sin descargar contenido
   */
  @Head(':id/stream')
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
  @ApiResponse({ status: 401, description: 'Invalid or missing stream token' })
  @ApiResponse({ status: 404, description: 'Track o archivo no encontrado' })
  async getStreamMetadata(
    @Param('id') trackId: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    // 1. Obtener metadata del track
    const metadata = await this.streamTrackUseCase.execute({ trackId });

    // 2. Configurar headers
    res.header('Content-Type', metadata.mimeType);
    res.header('Content-Length', metadata.fileSize.toString());
    res.header('Accept-Ranges', 'bytes');
    res.header('Cache-Control', 'public, max-age=31536000'); // 1 año

    // 3. Enviar solo headers (sin body)
    res.status(HttpStatus.OK).send();
  }

  /**
   * GET /tracks/:id/stream
   * Streamear audio con soporte para HTTP Range requests
   */
  @Get(':id/stream')
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
  @ApiResponse({ status: 401, description: 'Invalid or missing stream token' })
  @ApiResponse({ status: 404, description: 'Track o archivo no encontrado' })
  @ApiResponse({ status: 416, description: 'Range no satisfacible' })
  async streamTrack(
    @Param('id') trackId: string,
    @Headers('range') range: string | undefined,
    @Res() res: FastifyReply,
  ): Promise<void> {
    // 1. Obtener metadata del track
    const metadata = await this.streamTrackUseCase.execute({ trackId, range });

    const { filePath, fileSize, mimeType } = metadata;

    // 2. Si hay Range header, manejar partial content
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Validar rango
      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
        res.header('Content-Range', `bytes */${fileSize}`);
        res.send();
        return;
      }

      const chunkSize = end - start + 1;

      // Para streaming con Fastify, necesitamos usar res.raw directamente
      // y configurar headers en el objeto raw de Node.js
      res.raw.writeHead(HttpStatus.PARTIAL_CONTENT, {
        'Content-Type': mimeType,
        'Content-Length': chunkSize.toString(),
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });

      // Stream del rango solicitado
      const stream = fs.createReadStream(filePath, { start, end });

      // Track stream for cleanup
      this.activeStreams.add(stream);

      // Cleanup on finish/close/error
      const cleanup = () => {
        this.activeStreams.delete(stream);
      };

      stream.on('error', (error) => {
        cleanup();
        this.logger.error(
          { error: error instanceof Error ? error.message : error, trackId, start, end },
          'Error reading file (range request)'
        );
        if (!res.raw.destroyed) {
          res.raw.destroy();
        }
      });

      stream.on('close', cleanup);
      stream.on('end', cleanup);

      stream.pipe(res.raw);
    } else {
      // 3. Sin Range header, enviar archivo completo
      // Para streaming con Fastify, necesitamos usar res.raw directamente
      // y configurar headers en el objeto raw de Node.js
      res.raw.writeHead(HttpStatus.OK, {
        'Content-Type': mimeType,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });

      // Stream del archivo completo
      const stream = fs.createReadStream(filePath);

      // Track stream for cleanup
      this.activeStreams.add(stream);

      // Cleanup on finish/close/error
      const cleanup = () => {
        this.activeStreams.delete(stream);
      };

      stream.on('error', (error) => {
        cleanup();
        this.logger.error(
          { error: error instanceof Error ? error.message : error, trackId },
          'Error reading file (full stream)'
        );
        if (!res.raw.destroyed) {
          res.raw.destroy();
        }
      });

      stream.on('close', cleanup);
      stream.on('end', cleanup);

      stream.pipe(res.raw);
    }
  }

  /**
   * GET /tracks/:id/download
   * Descargar track completo
   */
  @Get(':id/download')
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
  @ApiResponse({ status: 404, description: 'Track o archivo no encontrado' })
  async downloadTrack(
    @Param('id') trackId: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    // 1. Obtener metadata del track
    const metadata = await this.streamTrackUseCase.execute({ trackId });

    const { filePath, fileName, fileSize, mimeType } = metadata;

    // 2. Encode filename for Content-Disposition (handle UTF-8 characters)
    const encodedFileName = encodeURIComponent(fileName).replace(/['()]/g, escape);

    // 3. Headers para descarga usando res.raw.writeHead (requerido para pipe)
    res.raw.writeHead(HttpStatus.OK, {
      'Content-Type': mimeType,
      'Content-Length': fileSize.toString(),
      'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`,
      'Cache-Control': 'public, max-age=31536000',
    });

    // 4. Stream del archivo
    const stream = fs.createReadStream(filePath);

    // Track stream for cleanup
    this.activeStreams.add(stream);

    // Cleanup on finish/close/error
    const cleanup = () => {
      this.activeStreams.delete(stream);
    };

    stream.on('error', (error) => {
      cleanup();
      this.logger.error(
        { error: error instanceof Error ? error.message : error, trackId },
        'Error reading file (download)'
      );
      if (!res.raw.destroyed) {
        res.raw.destroy();
      }
    });

    stream.on('close', cleanup);
    stream.on('end', cleanup);

    stream.pipe(res.raw);
  }
}
