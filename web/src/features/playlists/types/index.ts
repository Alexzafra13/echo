/**
 * Playlist types matching backend DTOs
 */

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  duration: number;
  size: number;
  ownerId: string;
  ownerName?: string;
  public: boolean;
  songCount: number;
  albumIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistTrack {
  id: string;
  title: string;
  trackNumber?: number;
  discNumber: number;
  year?: number;
  duration: number;
  size: string;
  path: string;
  albumId?: string;
  artistId?: string;
  bitRate?: number;
  createdAt: string;
  updatedAt: string;
  // Optional fields that might be populated
  artistName?: string;
  albumName?: string;
  suffix?: string;
  playlistOrder?: number;
  // ReplayGain audio normalization
  rgTrackGain?: number;
  rgTrackPeak?: number;
  rgAlbumGain?: number;
  rgAlbumPeak?: number;
  // Smart crossfade & DJ
  outroStart?: number;
  bpm?: number;
}

export interface CreatePlaylistDto {
  name: string;
  description?: string;
  public?: boolean;
}

export interface UpdatePlaylistDto {
  name?: string;
  description?: string;
  public?: boolean;
}

export interface AddTrackToPlaylistDto {
  trackId: string;
}

export interface TrackOrderDto {
  trackId: string;
  order: number;
}

export interface ReorderTracksDto {
  trackOrders: TrackOrderDto[];
}
