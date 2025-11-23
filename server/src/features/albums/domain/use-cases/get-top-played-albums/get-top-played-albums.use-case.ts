import { Injectable, Inject } from '@nestjs/common';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { GetTopPlayedAlbumsInput, GetTopPlayedAlbumsOutput } from './get-top-played-albums.dto';

/**
 * GetTopPlayedAlbumsUseCase - Obtener álbumes más reproducidos
 *
 * Responsabilidades:
 * - Obtener los álbumes con más reproducciones del repositorio
 * - Limitar el número de resultados
 * - Mapear entidades a DTOs
 *
 * Proceso:
 * 1. Validar parámetros (take)
 * 2. Buscar álbumes más reproducidos en repositorio (basado en PlayStats)
 * 3. Mapear entidades a DTOs
 * 4. Retornar lista de álbumes
 */
@Injectable()
export class GetTopPlayedAlbumsUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetTopPlayedAlbumsInput = {}): Promise<GetTopPlayedAlbumsOutput> {
    // 1. Validar parámetros
    // - take debe estar entre 1 y 50 para top played albums
    const take = Math.min(50, Math.max(1, input.take ?? 10));

    // 2. Buscar álbumes más reproducidos en BD
    const albums = await this.albumRepository.findMostPlayed(take);

    // 3. Mapear entidades del dominio a DTOs de respuesta
    return albums.map((album) => ({
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
    }));
  }
}
