import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError } from '@shared/errors';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { GetPlaylistTracksInput, GetPlaylistTracksOutput, TrackItem } from './get-playlist-tracks.dto';

@Injectable()
export class GetPlaylistTracksUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
  ) {}

  async execute(input: GetPlaylistTracksInput): Promise<GetPlaylistTracksOutput> {
    // 1. Validar input
    if (!input.playlistId || input.playlistId.trim() === '') {
      throw new ValidationError('Playlist ID is required');
    }

    // 2. Verificar que la playlist existe
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new NotFoundError('Playlist', input.playlistId);
    }

    // 3. Obtener tracks de la playlist
    const tracks = await this.playlistRepository.getPlaylistTracks(input.playlistId);

    // 4. Mapear a output
    const items: TrackItem[] = tracks.map((track) => ({
      id: track.id,
      title: track.title,
      trackNumber: track.trackNumber,
      discNumber: track.discNumber,
      year: track.year,
      duration: track.duration ?? 0,
      // Ensure size is always a valid BigInt to prevent JSON serialization errors
      size: track.size !== null && track.size !== undefined ? track.size : Number(0),
      path: track.path,
      albumId: track.albumId,
      artistId: track.artistId,
      bitRate: track.bitRate,
      suffix: track.suffix,
      artistName: track.artistName,
      albumName: track.albumName,
      playlistOrder: (track as any).playlistOrder,
      // Audio normalization data (LUFS/ReplayGain)
      rgTrackGain: track.rgTrackGain,
      rgTrackPeak: track.rgTrackPeak,
      rgAlbumGain: track.rgAlbumGain,
      rgAlbumPeak: track.rgAlbumPeak,
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
