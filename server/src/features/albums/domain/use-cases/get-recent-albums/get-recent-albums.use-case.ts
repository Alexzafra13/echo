import { Injectable, Inject } from '@nestjs/common';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { GetRecentAlbumsInput, GetRecentAlbumsOutput } from './get-recent-albums.dto';

/**
 * GetRecentAlbumsUseCase - Obtener álbumes agregados recientemente
 *
 * Responsabilidades:
 * - Obtener los álbumes más recientes del repositorio
 * - Limitar el número de resultados
 * - Mapear entidades a DTOs
 *
 * Proceso:
 * 1. Validar parámetros (take)
 * 2. Buscar álbumes recientes en repositorio
 * 3. Mapear entidades a DTOs
 * 4. Retornar lista de álbumes
 */
@Injectable()
export class GetRecentAlbumsUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetRecentAlbumsInput = {}): Promise<GetRecentAlbumsOutput> {
    // 1. Validar parámetros
    // - take debe estar entre 1 y 50 para álbumes recientes
    const take = Math.min(50, Math.max(1, input.take ?? 12));

    // 2. Buscar álbumes recientes en BD
    const albums = await this.albumRepository.findRecent(take);

    // 3. Mapear entidades del dominio a DTOs de respuesta
    return albums.map((album) => ({
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
    }));
  }
}
