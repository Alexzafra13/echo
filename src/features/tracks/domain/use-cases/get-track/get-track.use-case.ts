import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import { TRACK_REPOSITORY, ITrackRepository } from '../../ports/track-repository.port';
import { GetTrackInput, GetTrackOutput } from './get-track.dto';

/**
 * GetTrackUseCase - Obtener UN track por su ID
 *
 * Responsabilidades:
 * - Validar que el ID es válido
 * - Buscar el track en el repositorio
 * - Lanzar error si no existe
 * - Retornar el track
 */
@Injectable()
export class GetTrackUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  async execute(input: GetTrackInput): Promise<GetTrackOutput> {
    // 1. Validar entrada
    if (!input.id || input.id.trim() === '') {
      throw new NotFoundError('Track', 'invalid-id');
    }

    // 2. Buscar track en BD
    const track = await this.trackRepository.findById(input.id);

    // 3. Lanzar error si no existe
    if (!track) {
      throw new NotFoundError('Track', input.id);
    }

    // 4. Retornar
    return {
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
    };
  }
}
