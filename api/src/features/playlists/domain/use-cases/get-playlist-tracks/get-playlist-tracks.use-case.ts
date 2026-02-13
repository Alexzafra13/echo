import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { GetPlaylistTracksInput, GetPlaylistTracksOutput, TrackItem } from './get-playlist-tracks.dto';

@Injectable()
export class GetPlaylistTracksUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
  ) {}

  async execute(input: GetPlaylistTracksInput): Promise<GetPlaylistTracksOutput> {
    if (!input.playlistId || input.playlistId.trim() === '') {
      throw new ValidationError('Playlist ID is required');
    }

    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new NotFoundError('Playlist', input.playlistId);
    }

    // Verificar acceso: solo el owner o playlists públicas
    if (!playlist.public && input.requesterId && playlist.ownerId !== input.requesterId) {
      throw new ForbiddenError('You do not have access to this playlist'); // ← CAMBIADO
    }

    const tracks = await this.playlistRepository.getPlaylistTracks(input.playlistId);
    const items: TrackItem[] = tracks.map((track) => ({
      id: track.id,
      title: track.title,
      trackNumber: track.trackNumber,
      discNumber: track.discNumber,
      year: track.year,
      duration: track.duration ?? 0,
      // Prevenir errores de serialización JSON con BigInt
      size: track.size !== null && track.size !== undefined ? track.size : Number(0),
      path: track.path,
      albumId: track.albumId,
      artistId: track.artistId,
      bitRate: track.bitRate,
      suffix: track.suffix,
      artistName: track.artistName,
      albumName: track.albumName,
      playlistOrder: track.playlistOrder,
      // Normalización de audio (LUFS/ReplayGain)
      rgTrackGain: track.rgTrackGain,
      rgTrackPeak: track.rgTrackPeak,
      rgAlbumGain: track.rgAlbumGain,
      rgAlbumPeak: track.rgAlbumPeak,
      // Crossfade y DJ
      outroStart: track.outroStart,
      bpm: track.bpm,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    }));

    return {
      playlistId: playlist.id,
      playlistName: playlist.name,
      tracks: items,
      total: items.length,
    };
  }
}