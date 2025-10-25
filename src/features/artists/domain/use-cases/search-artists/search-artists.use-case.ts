import { Injectable, Inject } from '@nestjs/common';
import { ValidationError } from '@shared/errors';
import { ARTIST_REPOSITORY, IArtistRepository } from '../../ports/artist-repository.port';
import { SearchArtistsInput, SearchArtistsOutput } from './search-artists.dto';

/**
 * SearchArtistsUseCase - Buscar artistas por nombre
 *
 * Responsabilidades:
 * - Validar query de búsqueda (mínimo 2 caracteres)
 * - Validar parámetros de paginación
 * - Buscar artistas en el repositorio
 * - Retornar resultados paginados
 */
@Injectable()
export class SearchArtistsUseCase {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: IArtistRepository,
  ) {}

  async execute(input: SearchArtistsInput): Promise<SearchArtistsOutput> {
    // 1. Validar query de búsqueda
    if (!input.query || input.query.trim() === '') {
      throw new ValidationError('Search query cannot be empty');
    }

    const query = input.query.trim();

    if (query.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters long');
    }

    // 2. Validar y normalizar parámetros de paginación
    // IMPORTANTE: Usar ?? en lugar de || para permitir skip=0 y take=0
    const skip = Math.max(0, input.skip ?? 0);
    const take = Math.min(100, Math.max(1, input.take ?? 10));

    // 3. Buscar artistas
    const artists = await this.artistRepository.search(query, skip, take);

    // 4. Contar total de resultados (aproximado basado en resultados actuales)
    const total = artists.length < take ? skip + artists.length : skip + artists.length + 1;

    // 5. Mapear entidades a DTOs
    const data = artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      albumCount: artist.albumCount,
      songCount: artist.songCount,
      mbzArtistId: artist.mbzArtistId,
      biography: artist.biography,
      smallImageUrl: artist.smallImageUrl,
      mediumImageUrl: artist.mediumImageUrl,
      largeImageUrl: artist.largeImageUrl,
      externalUrl: artist.externalUrl,
      externalInfoUpdatedAt: artist.externalInfoUpdatedAt,
      orderArtistName: artist.orderArtistName,
      size: artist.size,
      createdAt: artist.createdAt,
      updatedAt: artist.updatedAt,
    }));

    // 6. Calcular si hay más resultados
    const hasMore = artists.length === take;

    // 7. Retornar
    return {
      data,
      total,
      skip,
      take,
      hasMore,
      query,
    };
  }
}
