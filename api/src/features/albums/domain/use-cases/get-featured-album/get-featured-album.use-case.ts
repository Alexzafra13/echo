import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { GetFeaturedAlbumOutput } from './get-featured-album.dto';

/**
 * GetFeaturedAlbumUseCase - Obtener álbum destacado para la sección hero
 *
 * Responsabilidades:
 * - Obtener el álbum más reproducido del repositorio
 * - Mapear entidad a DTO
 *
 * Proceso:
 * 1. Buscar el álbum más reproducido
 * 2. Si no hay álbumes, retornar el más reciente
 * 3. Mapear entidad a DTO
 * 4. Retornar álbum destacado
 */
@Injectable()
export class GetFeaturedAlbumUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(): Promise<GetFeaturedAlbumOutput> {
    // 1. Buscar álbum más reproducido en BD
    const mostPlayed = await this.albumRepository.findMostPlayed(1);

    // 2. Si hay álbumes con reproducciones, retornar el primero
    if (mostPlayed.length > 0) {
      const album = mostPlayed[0];
      return {
        id: album.id,
        name: album.name,
        artistId: album.artistId,
        artistName: album.artistName,
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

    // 3. Si no hay álbumes reproducidos, intentar con el más reciente
    const recent = await this.albumRepository.findRecent(1);
    if (recent.length > 0) {
      const album = recent[0];
      return {
        id: album.id,
        name: album.name,
        artistId: album.artistId,
        artistName: album.artistName,
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

    // 4. Si no hay álbumes en la BD, lanzar excepción
    throw new NotFoundError('Album', 'No albums found in the library');
  }
}
