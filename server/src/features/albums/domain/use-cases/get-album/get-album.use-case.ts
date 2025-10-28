import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import { Album } from '../../entities/album.entity';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { GetAlbumInput, GetAlbumOutput } from './get-album.dto';

/**
 * GetAlbumUseCase - Obtener UN álbum por su ID
 *
 * Responsabilidades:
 * - Validar que el ID es válido
 * - Buscar el álbum en el repositorio
 * - Lanzar error si no existe
 * - Retornar el álbum
 *
 * Proceso:
 * 1. Validar entrada (ID)
 * 2. Buscar álbum en repositorio
 * 3. Lanzar error si no existe
 * 4. Retornar álbum
 */
@Injectable()
export class GetAlbumUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetAlbumInput): Promise<GetAlbumOutput> {
    // 1. Validar entrada
    if (!input.id || input.id.trim() === '') {
      throw new NotFoundError('Album', 'invalid-id');
    }

    // 2. Buscar álbum en BD
    const album = await this.albumRepository.findById(input.id);

    // 3. Lanzar error si no existe
    if (!album) {
      throw new NotFoundError('Album', input.id);
    }

    // 4. Retornar
    return {
      id: album.id,
      name: album.name,
      artistId: album.artistId,
      albumArtistId: album.albumArtistId,
      coverArtPath: album.coverArtPath,
      year: album.year,
      releaseDate: album.releaseDate,
      compilation: album.compilation,
      songCount: album.songCount,
      duration: album.duration,
      size: album.size,
      description: album.description,
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
    };
  }
}