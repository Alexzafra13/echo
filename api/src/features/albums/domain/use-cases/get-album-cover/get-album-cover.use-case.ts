import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports';
import { CoverArtService } from '@shared/services';
import { getImageMimeType } from '@shared/utils';
import { GetAlbumCoverInput, GetAlbumCoverOutput } from './get-album-cover.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * GetAlbumCoverUseCase - Obtener cover art de un álbum
 *
 * Responsabilidades:
 * - Validar que el álbum existe
 * - Obtener ruta del cover art desde el caché
 * - Leer archivo de imagen
 * - Determinar MIME type correcto
 * - Retornar buffer de imagen con metadata
 *
 * Casos de uso:
 * - Servir cover art en endpoint HTTP
 * - Exportación de álbumes
 */
@Injectable()
export class GetAlbumCoverUseCase {
  constructor(
    @InjectPinoLogger(GetAlbumCoverUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
    private readonly coverArtService: CoverArtService,
  ) {}

  async execute(input: GetAlbumCoverInput): Promise<GetAlbumCoverOutput> {
    // 1. Validar input
    if (!input.albumId || input.albumId.trim() === '') {
      throw new NotFoundException('Album ID is required');
    }

    // 2. Buscar el álbum
    const album = await this.albumRepository.findById(input.albumId);
    if (!album) {
      throw new NotFoundException(`Album with ID ${input.albumId} not found`);
    }

    // 3. Obtener ruta absoluta del cover desde el caché
    const coverPath = this.coverArtService.getCoverPath(album.coverArtPath);
    if (!coverPath) {
      throw new NotFoundException('No cover art found for this album');
    }

    try {
      // 4. Leer archivo de cover
      const coverBuffer = await fs.readFile(coverPath);

      // 5. Determinar MIME type desde la extensión usando utilidad compartida
      const mimeType = getImageMimeType(path.extname(coverPath));

      // 6. Retornar output
      return {
        buffer: coverBuffer,
        mimeType,
        fileSize: coverBuffer.length,
      };
    } catch (error) {
      this.logger.error(
        { albumId: input.albumId, coverPath, error: error instanceof Error ? error.message : error },
        'Error reading cover art file',
      );
      throw new NotFoundException('Could not read cover art file');
    }
  }
}
