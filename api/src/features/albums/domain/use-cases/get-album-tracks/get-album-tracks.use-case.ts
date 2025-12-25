import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports';
import { TRACK_REPOSITORY, ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { GetAlbumTracksInput, GetAlbumTracksOutput } from './get-album-tracks.dto';

/**
 * GetAlbumTracksUseCase - Obtener tracks de un álbum
 *
 * Responsabilidades:
 * - Validar que el álbum existe
 * - Obtener los tracks ordenados por trackNumber
 * - Retornar información completa de los tracks
 *
 * Casos de uso:
 * - Vista de detalle de álbum
 * - Reproducción de álbum completo
 */
@Injectable()
export class GetAlbumTracksUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  async execute(input: GetAlbumTracksInput): Promise<GetAlbumTracksOutput> {
    // 1. Validar input
    if (!input.albumId || input.albumId.trim() === '') {
      throw new NotFoundError('Album', 'ID is required');
    }

    // 2. Verificar que el álbum existe
    const album = await this.albumRepository.findById(input.albumId);
    if (!album) {
      throw new NotFoundError('Album', input.albumId);
    }

    // 3. Obtener tracks del álbum (ya vienen ordenados por trackNumber)
    const tracks = await this.trackRepository.findByAlbumId(input.albumId);

    // 4. Retornar output
    return {
      tracks,
      albumId: input.albumId,
      totalTracks: tracks.length,
    };
  }
}
