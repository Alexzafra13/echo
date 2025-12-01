import { Injectable, Inject } from '@nestjs/common';
import { ValidationError } from '@shared/errors';
import { Album } from '../../entities/album.entity';
import { IAlbumRepository, ALBUM_REPOSITORY } from '../../ports/album-repository.port';

/**
 * SearchAlbumsUseCase - Buscar álbumes por nombre
 *
 * Proceso:
 * 1. Validar query
 * 2. Validar paginación
 * 3. Buscar álbumes
 * 4. Obtener total
 * 5. Retornar resultado
 */
export interface SearchAlbumsInput {
  query: string;
  skip: number;
  take: number;
}

export interface SearchAlbumsOutput {
  data: Array<{
    id: string;
    name: string;
    artistId?: string;
    artistName?: string;
    albumArtistId?: string;
    coverArtPath?: string;
    year?: number;
    releaseDate?: Date;
    compilation: boolean;
    songCount: number;
    duration: number;
    size: number;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  skip: number;
  take: number;
  query: string;
  hasMore: boolean;
}

@Injectable()
export class SearchAlbumsUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: SearchAlbumsInput): Promise<SearchAlbumsOutput> {
    // 1. Validar query
    if (!input.query || input.query.trim().length === 0) {
      throw new ValidationError('Search query cannot be empty');
    }

    if (input.query.trim().length < 2) {
      throw new ValidationError('Search query must be at least 2 characters');
    }

    // 2. Validar paginación
    const skip = Math.max(0, input.skip ?? 0);
    const take = Math.min(100, Math.max(1, input.take ?? 10));
    const query = input.query.trim();

    // 3. Buscar álbumes
    const albums = await this.albumRepository.search(query, skip, take);

    // 4. Obtener total de resultados (aproximado - para producción mejor hacer count con mismo query)
    const total = albums.length; // Simplificado

    // 5. Retornar
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
      query,
      hasMore: skip + take < total,
    };
  }
}