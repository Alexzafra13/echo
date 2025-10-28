import { Injectable, Inject } from '@nestjs/common';
import { TRACK_REPOSITORY, ITrackRepository } from '../../ports/track-repository.port';
import { GetTracksInput, GetTracksOutput } from './get-tracks.dto';

/**
 * GetTracksUseCase - Obtener lista paginada de tracks
 *
 * Responsabilidades:
 * - Validar parámetros de paginación (skip/take)
 * - Buscar tracks en el repositorio
 * - Contar total de tracks
 * - Retornar lista paginada con metadatos
 */
@Injectable()
export class GetTracksUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  async execute(input: GetTracksInput): Promise<GetTracksOutput> {
    // 1. Validar y normalizar parámetros de paginación
    // IMPORTANTE: Usar ?? en lugar de || para permitir skip=0 y take=0
    const skip = Math.max(0, input.skip ?? 0);
    const take = Math.min(100, Math.max(1, input.take ?? 10));

    // 2. Obtener tracks y total en paralelo
    const [tracks, total] = await Promise.all([
      this.trackRepository.findAll(skip, take),
      this.trackRepository.count(),
    ]);

    // 3. Mapear entidades a DTOs
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
