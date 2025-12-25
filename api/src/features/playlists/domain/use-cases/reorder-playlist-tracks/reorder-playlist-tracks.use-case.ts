import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { ReorderPlaylistTracksInput, ReorderPlaylistTracksOutput } from './reorder-playlist-tracks.dto';

@Injectable()
export class ReorderPlaylistTracksUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
  ) {}

  async execute(input: ReorderPlaylistTracksInput): Promise<ReorderPlaylistTracksOutput> {
    // 1. Validar input
    if (!input.playlistId || input.playlistId.trim() === '') {
      throw new ValidationError('Playlist ID is required');
    }

    if (!input.trackOrders || input.trackOrders.length === 0) {
      throw new ValidationError('Track orders array is required and cannot be empty');
    }

    // 2. Verificar que la playlist existe
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new NotFoundError('Playlist', input.playlistId);
    }

    // 3. SEGURIDAD: Verificar que el usuario es el propietario
    if (playlist.ownerId !== input.userId) {
      throw new ForbiddenError('You do not have permission to modify this playlist');
    }

    // 4. Validar que los órdenes sean válidos
    for (const item of input.trackOrders) {
      if (!item.trackId || item.trackId.trim() === '') {
        throw new ValidationError('Track ID is required for each track order');
      }
      if (item.order < 0) {
        throw new ValidationError('Track order must be non-negative');
      }
    }

    // 4. Verificar que todos los tracks están en la playlist
    for (const item of input.trackOrders) {
      const isInPlaylist = await this.playlistRepository.isTrackInPlaylist(input.playlistId, item.trackId);
      if (!isInPlaylist) {
        throw new NotFoundError('Track', `${item.trackId} is not in playlist ${input.playlistId}`);
      }
    }

    // 5. Reordenar tracks
    const reordered = await this.playlistRepository.reorderTracks(input.playlistId, input.trackOrders);

    if (!reordered) {
      throw new ValidationError(`Failed to reorder tracks in playlist ${input.playlistId}`);
    }

    // 6. Retornar output
    return {
      success: true,
      message: `Tracks in playlist ${input.playlistId} reordered successfully`,
      playlistId: input.playlistId,
    };
  }
}
