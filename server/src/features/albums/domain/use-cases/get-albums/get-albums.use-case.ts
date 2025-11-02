import { Injectable, Inject } from '@nestjs/common';
import { Album } from '../../entities/album.entity';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { GetAlbumsInput, GetAlbumsOutput } from './get-albums.dto';

/**
 * GetAlbumsUseCase - Obtener lista paginada de álbumes
 *
 * Responsabilidades:
 * - Validar parámetros de paginación
 * - Obtener la lista de álbumes del repositorio
 * - Contar el total de álbumes
 * - Calcular si hay más resultados
 * - Retornar resultado paginado
 *
 * Proceso:
 * 1. Validar paginación (skip, take)
 * 2. Buscar álbumes en repositorio
 * 3. Obtener total de álbumes
 * 4. Calcular si hay más resultados
 * 5. Mapear entidades a DTOs
 * 6. Retornar resultado paginado
 */
@Injectable()
export class GetAlbumsUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetAlbumsInput): Promise<GetAlbumsOutput> {
    // 1. Validar paginación
    // - skip no puede ser negativo
    // - take debe estar entre 1 y 100 para evitar queries gigantes
    const skip = Math.max(0, input.skip ?? 0);
    const take = Math.min(100, Math.max(1, input.take ?? 10));

    // 2. Buscar álbumes en BD
    const albums = await this.albumRepository.findAll(skip, take);

    // 3. Obtener total de álbumes en la BD
    const total = await this.albumRepository.count();

    // 4. Calcular si hay más resultados
    const hasMore = skip + take < total;

    // 5. Mapear entidades del dominio a DTOs de respuesta
    // 6. Retornar resultado paginado
    return {
      data: albums.map((album) => ({
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
      })),
      total,
      skip,
      take,
      hasMore,
    };
  }
}