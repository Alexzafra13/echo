import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
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
      throw new BadRequestException('Playlist ID is required');
    }

    if (!input.trackId || input.trackId.trim() === '') {
      throw new BadRequestException('Track ID is required');
    }

    // 2. Verificar que la playlist existe
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${input.playlistId} not found`);
    }

    // 3. Verificar que el track existe
    const track = await this.trackRepository.findById(input.trackId);
    if (!track) {
      throw new NotFoundException(`Track with ID ${input.trackId} not found`);
    }

    // 4. Verificar que el track no está ya en la playlist
    const isInPlaylist = await this.playlistRepository.isTrackInPlaylist(input.playlistId, input.trackId);
    if (isInPlaylist) {
      throw new ConflictException('Esta canción ya está en la playlist');
    }

    // 5. Obtener el siguiente orden (último + 1), empezando desde 1
    const existingTracks = await this.playlistRepository.getPlaylistTracks(input.playlistId);
    const nextOrder = existingTracks.length + 1;

    // 6. Crear PlaylistTrack
    const playlistTrack = PlaylistTrack.create({
      playlistId: input.playlistId,
      trackId: input.trackId,
      trackOrder: nextOrder,
    });

    // 7. Agregar track a la playlist
    const added = await this.playlistRepository.addTrack(playlistTrack);

    // 8. Actualizar metadata de la playlist (duration, size, songCount)
    playlist.updateDuration(playlist.duration + (track.duration ?? 0));
    playlist.updateSize(playlist.size + (track.size ?? BigInt(0)));
    playlist.updateSongCount(playlist.songCount + 1);
    await this.playlistRepository.update(playlist.id, playlist);

    // 9. Retornar output
    return {
      playlistId: added.playlistId,
      trackId: added.trackId,
      trackOrder: added.trackOrder,
      createdAt: added.createdAt,
      message: 'Track added to playlist successfully',
    };
  }
}
