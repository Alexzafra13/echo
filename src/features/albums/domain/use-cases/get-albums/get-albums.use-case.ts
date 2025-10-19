import { Injectable, Inject } from '@nestjs/common';
import { ValidationError } from '@shared/errors';
import { Album } from '../../entities/album.entity';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { GetAlbumsInput, GetAlbumsOutput } from './get-albums.dto';

/**
 * GetAlbumsUseCase - Obtener lista paginada de álbumes
 *
 * Proceso:
 * 1. Validar paginación (skip, take)
 * 2. Buscar álbumes en repositorio
 * 3. Obtener total de álbumes
 * 4. Calcular si hay más resultados
 * 5. Retornar resultado paginado
 */
@Injectable()
export class GetAlbumsUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetAlbumsInput): Promise<GetAlbumsOutput> {
    // 1. Validar paginación
    const skip = Math.max(0, input.skip || 0);
    const take = Math.min(100, Math.max(1, input.take || 10));

    // 2. Buscar álbumes
    const albums = await this.albumRepository.findAll(skip, take);

    // 3. Obtener total
    const total = await this.albumRepository.count();

    // 4. Calcular si hay más
    const hasMore = skip + take < total;

    // 5. Retornar
    return {
      data: albums.map((album) => ({
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
      })),
      total,
      skip,
      take,
      hasMore,
    };
  }
}