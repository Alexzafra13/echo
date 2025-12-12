import { Playlist, PlaylistTrack, PlaylistProps } from '../entities';
import { Track } from '@features/tracks/domain/entities/track.entity';

/**
 * Track con información adicional de posición en playlist
 */
export interface TrackWithPlaylistOrder extends Track {
  playlistOrder: number;
}

/**
 * Tipo para actualizar playlist (entity completo o propiedades parciales)
 */
export type PlaylistUpdateInput = Playlist | Partial<PlaylistProps>;

export interface IPlaylistRepository {
  // Playlist CRUD
  findById(id: string): Promise<Playlist | null>;
  findByOwnerId(ownerId: string, skip: number, take: number): Promise<Playlist[]>;
  findPublic(skip: number, take: number): Promise<Playlist[]>;
  search(name: string, skip: number, take: number): Promise<Playlist[]>;
  count(): Promise<number>;
  countByOwnerId(ownerId: string): Promise<number>;
  create(playlist: Playlist): Promise<Playlist>;
  update(id: string, playlist: PlaylistUpdateInput): Promise<Playlist | null>;
  delete(id: string): Promise<boolean>;

  // Find playlists containing tracks by a specific artist
  findByArtistId(
    artistId: string,
    userId: string,
    skip: number,
    take: number,
  ): Promise<{ playlists: Playlist[]; total: number }>;

  // PlaylistTrack management
  addTrack(playlistTrack: PlaylistTrack): Promise<PlaylistTrack>;
  addTrackWithAutoOrder(playlistId: string, trackId: string): Promise<PlaylistTrack>;
  removeTrack(playlistId: string, trackId: string): Promise<boolean>;
  getPlaylistTracks(playlistId: string): Promise<TrackWithPlaylistOrder[]>;
  getPlaylistAlbumIds(playlistId: string): Promise<string[]>;
  getBatchPlaylistAlbumIds(playlistIds: string[]): Promise<Map<string, string[]>>;
  reorderTracks(playlistId: string, trackOrders: Array<{ trackId: string; order: number }>): Promise<boolean>;
  isTrackInPlaylist(playlistId: string, trackId: string): Promise<boolean>;
}

export const PLAYLIST_REPOSITORY = 'IPlaylistRepository';
