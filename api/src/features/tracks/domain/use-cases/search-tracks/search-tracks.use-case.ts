import { Injectable, Inject } from '@nestjs/common';
import { ValidationError } from '@shared/errors';
import { TRACK_REPOSITORY, ITrackRepository } from '../../ports/track-repository.port';
import { SearchTracksInput, SearchTracksOutput } from './search-tracks.dto';

/**
 * SearchTracksUseCase - Buscar tracks por título
 *
 * Responsabilidades:
 * - Validar query de búsqueda (mínimo 2 caracteres)
 * - Validar parámetros de paginación
 * - Buscar tracks en el repositorio
 * - Retornar resultados paginados
 */
@Injectable()
export class SearchTracksUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  async execute(input: SearchTracksInput): Promise<SearchTracksOutput> {
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

    // 3. Buscar tracks
    const tracks = await this.trackRepository.search(query, skip, take);

    // 4. Contar total de resultados (aproximado basado en resultados actuales)
    // En una implementación real, el repositorio debería tener un método countSearch()
    const total = tracks.length < take ? skip + tracks.length : skip + tracks.length + 1;

    // 5. Mapear entidades a DTOs
    const data = tracks.map((track) => ({
      id: track.id,
      title: track.title,
      albumId: track.albumId,
      artistId: track.artistId,
      albumArtistId: track.albumArtistId,
      trackNumber: track.trackNumber,
      discNumber: track.discNumber,
      year: track.year,
      duration: track.duration,
      path: track.path,
      bitRate: track.bitRate,
      size: track.size,
      suffix: track.suffix,
      lyrics: track.lyrics,
      comment: track.comment,
      albumName: track.albumName,
      artistName: track.artistName,
      albumArtistName: track.albumArtistName,
      compilation: track.compilation,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    }));

    // 6. Calcular si hay más resultados
    const hasMore = tracks.length === take;

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
