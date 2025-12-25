import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { TRACK_REPOSITORY } from '@features/tracks/domain/ports/track-repository.port';
import { ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { RemoveTrackFromPlaylistInput, RemoveTrackFromPlaylistOutput } from './remove-track-from-playlist.dto';

@Injectable()
export class RemoveTrackFromPlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  async execute(input: RemoveTrackFromPlaylistInput): Promise<RemoveTrackFromPlaylistOutput> {
    // 1. Validar input
    if (!input.playlistId || input.playlistId.trim() === '') {
      throw new ValidationError('Playlist ID is required');
    }

    if (!input.trackId || input.trackId.trim() === '') {
      throw new ValidationError('Track ID is required');
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

    // 4. Verificar que el track existe
    const track = await this.trackRepository.findById(input.trackId);
    if (!track) {
      throw new NotFoundError('Track', input.trackId);
    }

    // 4. Verificar que el track está en la playlist
    const isInPlaylist = await this.playlistRepository.isTrackInPlaylist(input.playlistId, input.trackId);
    if (!isInPlaylist) {
      throw new NotFoundError('Track', `${input.trackId} is not in playlist ${input.playlistId}`);
    }

    // 5. Remover track de la playlist
    const removed = await this.playlistRepository.removeTrack(input.playlistId, input.trackId);

    if (!removed) {
      throw new NotFoundError('Track', `Failed to remove ${input.trackId} from playlist ${input.playlistId}`);
    }

    // 6. Actualizar metadata de la playlist (duration, size, songCount)
    const trackDuration = track.duration ?? 0;
    // Safe BigInt subtraction - ensure BOTH operands are valid BigInt
    const playlistSize = playlist.size !== null && playlist.size !== undefined
      ? Number(playlist.size || 0)
      : Number(0);
    const trackSize = track.size !== null && track.size !== undefined
      ? Number(track.size || 0)
      : Number(0);
    playlist.updateDuration(Math.max(0, playlist.duration - trackDuration));
    playlist.updateSize(playlistSize > trackSize ? playlistSize - trackSize : Number(0));
    playlist.updateSongCount(Math.max(0, playlist.songCount - 1));
    await this.playlistRepository.update(playlist.id, playlist);

    // 7. Retornar output
    return {
      success: true,
      message: `Track ${input.trackId} removed from playlist ${input.playlistId} successfully`,
    };
  }
}
