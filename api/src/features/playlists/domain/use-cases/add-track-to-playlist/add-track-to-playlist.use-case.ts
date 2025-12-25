import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '@shared/errors';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { TRACK_REPOSITORY } from '@features/tracks/domain/ports/track-repository.port';
import { ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { PlaylistTrack } from '../../entities';
import { AddTrackToPlaylistInput, AddTrackToPlaylistOutput } from './add-track-to-playlist.dto';

@Injectable()
export class AddTrackToPlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  async execute(input: AddTrackToPlaylistInput): Promise<AddTrackToPlaylistOutput> {
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

    // 4. Verificar que el track no está ya en la playlist
    const isInPlaylist = await this.playlistRepository.isTrackInPlaylist(input.playlistId, input.trackId);
    if (isInPlaylist) {
      throw new ConflictError('Esta canción ya está en la playlist');
    }

    // 5. Agregar track con auto-asignación de orden (race condition safe)
    const added = await this.playlistRepository.addTrackWithAutoOrder(input.playlistId, input.trackId);

    // 6. Actualizar metadata de la playlist (duration, size, songCount)
    playlist.updateDuration(playlist.duration + (track.duration ?? 0));
    // Safe BigInt addition - ensure BOTH operands are valid BigInt
    const playlistSize = playlist.size !== null && playlist.size !== undefined
      ? Number(playlist.size || 0)
      : Number(0);
    const trackSize = track.size !== null && track.size !== undefined
      ? Number(track.size || 0)
      : Number(0);
    playlist.updateSize(playlistSize + trackSize);
    playlist.updateSongCount(playlist.songCount + 1);
    await this.playlistRepository.update(playlist.id, playlist);

    // 7. Retornar output
    return {
      playlistId: added.playlistId,
      trackId: added.trackId,
      trackOrder: added.trackOrder,
      createdAt: added.createdAt,
      message: 'Track added to playlist successfully',
    };
  }
}
