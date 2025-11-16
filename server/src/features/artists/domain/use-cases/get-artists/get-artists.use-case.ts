import { Injectable, Inject } from '@nestjs/common';
import { ARTIST_REPOSITORY, IArtistRepository } from '../../ports/artist-repository.port';
import { GetArtistsInput, GetArtistsOutput } from './get-artists.dto';

/**
 * GetArtistsUseCase - Obtener lista paginada de artistas
 *
 * Responsabilidades:
 * - Validar parámetros de paginación (skip/take)
 * - Buscar artistas en el repositorio
 * - Contar total de artistas
 * - Retornar lista paginada con metadatos
 */
@Injectable()
export class GetArtistsUseCase {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: IArtistRepository,
  ) {}

  async execute(input: GetArtistsInput): Promise<GetArtistsOutput> {
    // 1. Validar y normalizar parámetros de paginación
    // IMPORTANTE: Usar ?? en lugar de || para permitir skip=0 y take=0
    const skip = Math.max(0, input.skip ?? 0);
    const take = Math.min(100, Math.max(1, input.take ?? 10));

    // 2. Obtener artistas y total en paralelo
    const [artists, total] = await Promise.all([
      this.artistRepository.findAll(skip, take),
      this.artistRepository.count(),
    ]);

    // 3. Mapear entidades a DTOs
    const data = artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      albumCount: artist.albumCount,
      songCount: artist.songCount,
      mbzArtistId: artist.mbzArtistId,
      biography: artist.biography,
      externalUrl: artist.externalUrl,
      externalInfoUpdatedAt: artist.externalInfoUpdatedAt,
      orderArtistName: artist.orderArtistName,
      size: artist.size,
      createdAt: artist.createdAt,
      updatedAt: artist.updatedAt,
    }));

    // 4. Calcular si hay más resultados
    const hasMore = skip + take < total;

    // 5. Retornar
    return {
      data,
      total,
      skip,
      take,
      hasMore,
    };
  }
}
