import { apiClient } from '@shared/services/api';

export interface ExploreAlbum {
  id: string;
  name: string;
  artistId: string | null;
  artistName: string | null;
  coverArtPath: string | null;
  year: number | null;
  songCount: number;
  duration: number;
}

export interface ExploreTrack {
  id: string;
  title: string;
  albumId: string | null;
  albumName: string | null;
  artistId: string | null;
  artistName: string | null;
  coverArtPath: string | null;
  duration: number;
  playCount: number;
}

export interface ExploreArtist {
  id: string;
  name: string;
  imagePath: string | null;
  albumCount: number;
  songCount: number;
}

export interface ExploreAlbumsResponse {
  albums: ExploreAlbum[];
  total: number;
  limit: number;
  offset: number;
}

export interface ExploreTracksResponse {
  tracks: ExploreTrack[];
  total: number;
}

export const exploreService = {
  /**
   * Get albums never played by the user
   */
  getUnplayedAlbums: async (
    limit: number = 20,
    offset: number = 0,
  ): Promise<ExploreAlbumsResponse> => {
    const { data } = await apiClient.get<ExploreAlbumsResponse>('/explore/unplayed', {
      params: { limit, offset },
    });
    return data;
  },

  /**
   * Get albums not played in recent months
   */
  getForgottenAlbums: async (
    limit: number = 20,
    offset: number = 0,
    monthsAgo: number = 3,
  ): Promise<ExploreAlbumsResponse> => {
    const { data } = await apiClient.get<ExploreAlbumsResponse>('/explore/forgotten', {
      params: { limit, offset, monthsAgo },
    });
    return data;
  },

  /**
   * Get lesser-played tracks from favorite artists
   */
  getHiddenGems: async (limit: number = 30): Promise<ExploreTracksResponse> => {
    const { data } = await apiClient.get<ExploreTracksResponse>('/explore/hidden-gems', {
      params: { limit },
    });
    return data;
  },

  /**
   * Get a random album
   */
  getRandomAlbum: async (): Promise<{ album: ExploreAlbum | null }> => {
    const { data } = await apiClient.get<{ album: ExploreAlbum | null }>('/explore/random/album');
    return data;
  },

  /**
   * Get a random artist
   */
  getRandomArtist: async (): Promise<{ artist: ExploreArtist | null }> => {
    const { data } = await apiClient.get<{ artist: ExploreArtist | null }>('/explore/random/artist');
    return data;
  },

  /**
   * Get multiple random albums
   */
  getRandomAlbums: async (count: number = 6): Promise<{ albums: ExploreAlbum[] }> => {
    const { data } = await apiClient.get<{ albums: ExploreAlbum[] }>('/explore/random/albums', {
      params: { count },
    });
    return data;
  },
};
