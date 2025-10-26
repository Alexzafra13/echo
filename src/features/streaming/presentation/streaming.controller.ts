import {
  Controller,
  Get,
  Head,
  Param,
  Headers,
  Res,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiHeader,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { StreamTrackUseCase } from '../domain/use-cases';
import * as fs from 'fs';

/**
 * StreamingController - Controlador de streaming de audio
 *
 * Responsabilidades:
 * - Streamear archivos de audio con soporte para HTTP Range requests
 * - Proporcionar metadata de archivos (HEAD)
 * - Manejar descarga completa de archivos
 */
@ApiTags('streaming')
@ApiBearerAuth('JWT-auth')
@Controller('tracks')
export class StreamingController {
  constructor(private readonly streamTrackUseCase: StreamTrackUseCase) {}

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
  @ApiResponse({
    status: 200,
    description: 'Metadata obtenida exitosamente',
    headers: {
      'Content-Type': { description: 'MIME type del audio', schema: { type: 'string' } },
      'Content-Length': { description: 'Tamaño del archivo en bytes', schema: { type: 'number' } },
      'Accept-Ranges': { description: 'Soporte de rangos', schema: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 404, description: 'Track o archivo no encontrado' })
  async getStreamMetadata(
    @Param('id') trackId: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    // 1. Obtener metadata del track
    const metadata = await this.streamTrackUseCase.execute({ trackId });

    // 2. Configurar headers
    res.headers({
      'Content-Type': metadata.mimeType,
      'Content-Length': metadata.fileSize.toString(),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000', // 1 año
    });

    // 3. Enviar solo headers (sin body)
    res.status(HttpStatus.OK).end();
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
        res.headers({
          'Content-Range': `bytes */${fileSize}`,
        });
        res.end();
        return;
      }

      const chunkSize = end - start + 1;

      // Headers para partial content
      res.status(HttpStatus.PARTIAL_CONTENT);
      res.headers({
        'Content-Type': mimeType,
        'Content-Length': chunkSize.toString(),
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });

      // Stream del rango solicitado
      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res.raw);
    } else {
      // 3. Sin Range header, enviar archivo completo
      res.status(HttpStatus.OK);
      res.headers({
        'Content-Type': mimeType,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });

      // Stream del archivo completo
      const stream = fs.createReadStream(filePath);
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

    // 2. Headers para descarga
    res.headers({
      'Content-Type': mimeType,
      'Content-Length': fileSize.toString(),
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'public, max-age=31536000',
    });

    // 3. Stream del archivo
    const stream = fs.createReadStream(filePath);
    stream.pipe(res.raw);
  }
}
