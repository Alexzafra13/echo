import { Playlist, PlaylistTrack } from '../entities';
import { Track } from '@features/tracks/domain/entities/track.entity';

/** Track with its position in a playlist (1-indexed for display) */
export interface TrackWithPlaylistOrder extends Track {
  playlistOrder: number;
}

export interface IPlaylistRepository {
  // Playlist CRUD
  findById(id: string): Promise<Playlist | null>;
  findByOwnerId(ownerId: string, skip: number, take: number): Promise<Playlist[]>;
  findPublic(skip: number, take: number): Promise<Playlist[]>;
  findPublicByArtistId(
    artistId: string,
    skip: number,
    take: number,
    userId?: string
  ): Promise<Playlist[]>;
  countPublicByArtistId(artistId: string, userId?: string): Promise<number>;
  search(name: string, skip: number, take: number): Promise<Playlist[]>;
  count(): Promise<number>;
  countByOwnerId(ownerId: string): Promise<number>;
  create(playlist: Playlist): Promise<Playlist>;
  update(id: string, playlist: Partial<Playlist>): Promise<Playlist | null>;
  delete(id: string): Promise<boolean>;

  // PlaylistTrack management
  addTrack(playlistTrack: PlaylistTrack): Promise<PlaylistTrack>;
  addTrackWithAutoOrder(playlistId: string, trackId: string): Promise<PlaylistTrack>;
  removeTrack(playlistId: string, trackId: string): Promise<boolean>;
  getPlaylistTracks(playlistId: string): Promise<TrackWithPlaylistOrder[]>;
  getPlaylistAlbumIds(playlistId: string): Promise<string[]>;
  getBatchPlaylistAlbumIds(playlistIds: string[]): Promise<Map<string, string[]>>;
  reorderTracks(
    playlistId: string,
    trackOrders: Array<{ trackId: string; order: number }>
  ): Promise<boolean>;
  isTrackInPlaylist(playlistId: string, trackId: string): Promise<boolean>;
}

export const PLAYLIST_REPOSITORY = 'IPlaylistRepository';
