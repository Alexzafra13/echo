import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FastifyReply } from 'fastify';
import { DownloadService } from '../infrastructure/services/download.service';
import { StreamTokenGuard } from '../domain/stream-token.guard';
import { AllowChangePassword } from '@shared/decorators/allow-change-password.decorator';

/**
 * DownloadController - Controlador de descarga de archivos
 *
 * Responsabilidades:
 * - Descargar álbumes completos como ZIP
 *
 * Autenticación: Usa StreamTokenGuard que valida tokens de streaming
 * en query parameters (permite descarga desde browser)
 */
@ApiTags('downloads')
@Controller('albums')
@UseGuards(StreamTokenGuard)
@AllowChangePassword()
export class DownloadController {
  constructor(
    @InjectPinoLogger(DownloadController.name)
    private readonly logger: PinoLogger,
    private readonly downloadService: DownloadService,
  ) {}

  /**
   * GET /albums/:id/download
   * Descargar álbum completo como ZIP
   */
  @Get(':id/download')
  @ApiOperation({
    summary: 'Descargar álbum como ZIP',
    description: 'Descarga el álbum completo como archivo ZIP con todas las canciones y carátula',
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
  })
  @ApiResponse({
    status: 200,
    description: 'Descarga iniciada exitosamente',
    content: {
      'application/zip': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Álbum no encontrado' })
  async downloadAlbum(
    @Param('id') albumId: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    this.logger.info({ albumId }, 'Starting album download');

    // 1. Get album info
    const albumInfo = await this.downloadService.getAlbumDownloadInfo(albumId);

    // 2. Calculate estimated size
    const estimatedSize = await this.downloadService.calculateAlbumSize(albumInfo);

    // 3. Sanitize filename for Content-Disposition
    const fileName = `${albumInfo.artistName} - ${albumInfo.albumName}.zip`
      .replace(/[<>:"/\\|?*]/g, '_')
      .slice(0, 200);

    // 4. Set headers
    res.raw.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Transfer-Encoding': 'chunked',
      // Estimated size (ZIP with no compression will be similar to sum of files)
      'X-Estimated-Size': estimatedSize.toString(),
    });

    // 5. Stream ZIP to response
    try {
      await this.downloadService.streamAlbumAsZip(albumInfo, res.raw);
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : error, albumId },
        'Error streaming album ZIP',
      );
      // Response might already be partially sent, so we can't change status
      if (!res.raw.writableEnded) {
        res.raw.end();
      }
    }
  }
}
