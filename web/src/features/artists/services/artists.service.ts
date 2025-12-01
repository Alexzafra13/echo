import { apiClient } from '@shared/services/api';
import type { ArtistDetail, PaginatedArtists } from '../types';
import type { Album } from '@features/home/types';

/**
 * Paginated albums response for artist
 */
interface PaginatedArtistAlbums {
  data: Album[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

/**
 * Artists Service
 * Service layer for artist-related API calls
 */
export const artistsService = {
  /**
   * Get paginated list of all artists (sorted alphabetically)
   */
  async getAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<PaginatedArtists> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 100; // Get 100 by default for alphabetical list

    const response = await apiClient.get<PaginatedArtists>('/artists', {
      params: { skip, take },
    });

    return response.data;
  },

  /**
   * Get artist detail by ID
   */
  async getById(id: string): Promise<ArtistDetail> {
    const response = await apiClient.get<ArtistDetail>(`/artists/${id}`);
    return response.data;
  },

  /**
   * Search artists by name
   */
  async search(query: string, params?: {
    skip?: number;
    take?: number;
  }): Promise<PaginatedArtists> {
    if (!query || query.length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }

    const skip = params?.skip ?? 0;
    const take = params?.take ?? 50;

    const response = await apiClient.get<PaginatedArtists>(`/artists/search/${encodeURIComponent(query)}`, {
      params: { skip, take },
    });

    return response.data;
  },

  /**
   * Get albums by artist ID
   */
  async getAlbums(artistId: string, params?: {
    skip?: number;
    take?: number;
  }): Promise<PaginatedArtistAlbums> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 100;

    const response = await apiClient.get<PaginatedArtistAlbums>(`/artists/${artistId}/albums`, {
      params: { skip, take },
    });

    return response.data;
  },
};
