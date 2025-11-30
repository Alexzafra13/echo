import { apiClient } from '@shared/services/api';

export interface PublicUser {
  id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
  bio?: string;
  isPublicProfile: boolean;
  memberSince: string;
}

export interface TopTrack {
  id: string;
  title: string;
  artistName?: string;
  albumName?: string;
  albumId?: string;
  artistId?: string;
  playCount: number;
  coverUrl?: string;
}

export interface TopArtist {
  id: string;
  name: string;
  imageUrl?: string;
  playCount: number;
}

export interface TopAlbum {
  id: string;
  name: string;
  artistName?: string;
  artistId?: string;
  coverUrl?: string;
  playCount: number;
  year?: number;
}

export interface PublicPlaylist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  songCount: number;
  duration: number;
  createdAt: string;
}

export interface PrivacySettingsVisibility {
  showTopTracks: boolean;
  showTopArtists: boolean;
  showTopAlbums: boolean;
  showPlaylists: boolean;
}

export interface PublicProfile {
  user: PublicUser;
  topTracks?: TopTrack[];
  topArtists?: TopArtist[];
  topAlbums?: TopAlbum[];
  playlists?: PublicPlaylist[];
  settings: PrivacySettingsVisibility;
}

export const publicProfilesService = {
  async getPublicProfile(userId: string): Promise<PublicProfile> {
    const response = await apiClient.get<PublicProfile>(`/profiles/${userId}`);
    return response.data;
  },
};
