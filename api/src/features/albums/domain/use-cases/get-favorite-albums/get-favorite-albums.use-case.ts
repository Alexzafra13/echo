import { Injectable, Inject } from '@nestjs/common';
import { IAlbumRepository, ALBUM_REPOSITORY } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';

export interface GetFavoriteAlbumsInput {
  userId: string;
  page: number;
  limit: number;
}

export interface GetFavoriteAlbumsOutput {
  albums: Album[];
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * GetFavoriteAlbumsUseCase - Obtener álbumes favoritos del usuario
 *
 * Responsabilidades:
 * - Validar entrada (paginación)
 * - Obtener álbumes marcados con "like" por el usuario
 * - Ordenar por fecha de like (más recientes primero)
 * - Retornar con información de paginación
 *
 * Nota:
 * - Solo retorna álbumes con sentiment='like'
 * - No incluye álbumes con sentiment='dislike'
 * - Si el usuario no tiene favoritos, retorna array vacío
 */
@Injectable()
export class GetFavoriteAlbumsUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetFavoriteAlbumsInput): Promise<GetFavoriteAlbumsOutput> {
    // 1. Validar entrada
    const page = Math.max(1, input.page || 1);
    const limit = Math.min(100, Math.max(1, input.limit || 20)); // Entre 1 y 100
    const skip = (page - 1) * limit;

    // 2. Obtener álbumes favoritos
    // Traemos limit + 1 para saber si hay más páginas
    const albums = await this.albumRepository.findFavorites(input.userId, skip, limit + 1);

    // 3. Determinar si hay más páginas
    const hasMore = albums.length > limit;
    const albumsToReturn = hasMore ? albums.slice(0, limit) : albums;

    return {
      albums: albumsToReturn,
      page,
      limit,
      hasMore,
    };
  }
}
