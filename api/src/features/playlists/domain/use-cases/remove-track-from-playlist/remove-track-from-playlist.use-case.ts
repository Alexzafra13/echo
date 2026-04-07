import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import { assertCanEditPlaylist } from '../../services/playlist-authorization';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { ICollaboratorRepository, COLLABORATOR_REPOSITORY } from '../../ports';
import { TRACK_REPOSITORY } from '@features/tracks/domain/ports/track-repository.port';
import { ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import {
  RemoveTrackFromPlaylistInput,
  RemoveTrackFromPlaylistOutput,
} from './remove-track-from-playlist.dto';

@Injectable()
export class RemoveTrackFromPlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
    @Inject(COLLABORATOR_REPOSITORY)
    private readonly collaboratorRepository: ICollaboratorRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository
  ) {}

  async execute(input: RemoveTrackFromPlaylistInput): Promise<RemoveTrackFromPlaylistOutput> {
    // 1. Verificar que la playlist existe
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new NotFoundError('Playlist', input.playlistId);
    }

    // 3. SEGURIDAD: Verificar que el usuario es el propietario o editor colaborador
    await assertCanEditPlaylist(playlist, input.userId, this.collaboratorRepository);

    // 4. Verificar que el track existe
    const track = await this.trackRepository.findById(input.trackId);
    if (!track) {
      throw new NotFoundError('Track', input.trackId);
    }

    // 4. Verificar que el track está en la playlist
    const isInPlaylist = await this.playlistRepository.isTrackInPlaylist(
      input.playlistId,
      input.trackId
    );
    if (!isInPlaylist) {
      throw new NotFoundError('Track', `${input.trackId} is not in playlist ${input.playlistId}`);
    }

    // 5. Remover track de la playlist
    const removed = await this.playlistRepository.removeTrack(input.playlistId, input.trackId);

    if (!removed) {
      throw new NotFoundError(
        'Track',
        `Failed to remove ${input.trackId} from playlist ${input.playlistId}`
      );
    }

    // 6. Recalcular metadata desde datos reales (evita desincronización)
    await this.playlistRepository.recalculateMetadata(input.playlistId);

    // 7. Retornar output
    return {
      success: true,
      message: `Track ${input.trackId} removed from playlist ${input.playlistId} successfully`,
    };
  }
}
