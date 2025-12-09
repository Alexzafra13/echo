import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FastifyReply } from 'fastify';
import { DownloadAlbumUseCase } from '../domain/use-cases';
import { StreamTokenGuard } from '../domain/stream-token.guard';
import { AllowChangePassword } from '@shared/decorators/allow-change-password.decorator';

/**
 * AlbumDownloadController - Controller for downloading albums as ZIP archives
 *
 * Responsibilities:
 * - Download complete albums as ZIP files
 * - Stream ZIP archives efficiently without loading into memory
 *
 * Authentication: Uses StreamTokenGuard (same as track streaming)
 */
@ApiTags('streaming')
@Controller('albums')
@UseGuards(StreamTokenGuard)
@AllowChangePassword()
export class AlbumDownloadController {
  constructor(
    @InjectPinoLogger(AlbumDownloadController.name)
    private readonly logger: PinoLogger,
    private readonly downloadAlbumUseCase: DownloadAlbumUseCase,
  ) {}

  /**
   * GET /albums/:id/download
   * Download all tracks from an album as a ZIP archive
   */
  @Get(':id/download')
  @ApiOperation({
    summary: 'Descargar álbum completo',
    description: 'Descarga todas las canciones del álbum en un archivo ZIP',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID del álbum',
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
    description: 'Descarga del ZIP iniciada exitosamente',
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing stream token' })
  @ApiResponse({ status: 404, description: 'Álbum no encontrado o sin tracks disponibles' })
  async downloadAlbum(
    @Param('id') albumId: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    this.logger.info({ albumId }, 'Album download requested');

    // 1. Get album archive stream
    const result = await this.downloadAlbumUseCase.execute({ albumId });

    // 2. Encode filename for Content-Disposition (handle UTF-8 characters)
    const encodedFileName = encodeURIComponent(result.fileName).replace(/['()]/g, escape);

    // 3. Set headers for download
    res.raw.writeHead(HttpStatus.OK, {
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.fileName}"; filename*=UTF-8''${encodedFileName}`,
      'Cache-Control': 'no-cache', // Don't cache ZIP downloads
    });

    this.logger.info(
      { albumId, fileName: result.fileName, trackCount: result.trackCount },
      'Streaming album ZIP download',
    );

    // 4. Pipe archive stream to response
    result.stream.on('error', (error) => {
      this.logger.error(
        { error: error instanceof Error ? error.message : error, albumId },
        'Error streaming album ZIP',
      );
      if (!res.raw.destroyed) {
        res.raw.destroy();
      }
    });

    result.stream.pipe(res.raw);
  }
}
