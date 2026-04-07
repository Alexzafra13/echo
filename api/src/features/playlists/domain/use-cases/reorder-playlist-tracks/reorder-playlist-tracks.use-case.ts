import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError } from '@shared/errors';
import { assertCanEditPlaylist } from '../../services/playlist-authorization';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { ICollaboratorRepository, COLLABORATOR_REPOSITORY } from '../../ports';
import {
  ReorderPlaylistTracksInput,
  ReorderPlaylistTracksOutput,
} from './reorder-playlist-tracks.dto';

@Injectable()
export class ReorderPlaylistTracksUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
    @Inject(COLLABORATOR_REPOSITORY)
    private readonly collaboratorRepository: ICollaboratorRepository
  ) {}

  async execute(input: ReorderPlaylistTracksInput): Promise<ReorderPlaylistTracksOutput> {
    // 1. Validar input
    if (!input.trackOrders || input.trackOrders.length === 0) {
      throw new ValidationError('Track orders array is required and cannot be empty');
    }

    // 2. Verificar que la playlist existe
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new NotFoundError('Playlist', input.playlistId);
    }

    // 3. SEGURIDAD: Verificar que el usuario es el propietario o editor colaborador
    await assertCanEditPlaylist(playlist, input.userId, this.collaboratorRepository);

    // 4. Validar que los órdenes sean válidos
    for (const item of input.trackOrders) {
      if (!item.trackId || item.trackId.trim() === '') {
        throw new ValidationError('Track ID is required for each track order');
      }
      if (item.order < 0) {
        throw new ValidationError('Track order must be non-negative');
      }
    }

    // La transacción en reorderTracks ya maneja el caso de tracks inexistentes
    // (el UPDATE con WHERE track_id IN (...) simplemente no afecta IDs que no existen)
    // No necesitamos la verificación previa — la eliminamos para evitar N+1

    // 5. Reordenar tracks
    const reordered = await this.playlistRepository.reorderTracks(
      input.playlistId,
      input.trackOrders
    );

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
