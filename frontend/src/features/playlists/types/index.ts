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
  public: boolean;
  songCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistTrack {
  id: string;
  playlistId: string;
  trackId: string;
  trackOrder: number;
  createdAt: string;
  // Track details included when fetching playlist tracks
  track?: {
    id: string;
    title: string;
    artistName?: string;
    albumName?: string;
    albumId?: string;
    duration?: number;
    trackNumber?: number;
    suffix?: string;
    bitRate?: number;
  };
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

export interface ReorderTracksDto {
  trackIds: string[];
}
