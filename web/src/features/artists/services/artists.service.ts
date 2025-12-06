import { apiClient } from '@shared/services/api';
import type { PaginatedResponse, PaginationParams } from '@shared/types';
import type { ArtistDetail, PaginatedArtists } from '../types';
import type { Album } from '@features/home/types';

/**
 * Artists Service
 * Service layer for artist-related API calls
 */
export const artistsService = {
  /**
   * Get paginated list of all artists (sorted alphabetically)
   */
  async getAll(params?: PaginationParams): Promise<PaginatedArtists> {
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
  async search(query: string, params?: PaginationParams): Promise<PaginatedArtists> {
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
  async getAlbums(artistId: string, params?: PaginationParams): Promise<PaginatedResponse<Album>> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 100;

    const response = await apiClient.get<PaginatedResponse<Album>>(`/artists/${artistId}/albums`, {
      params: { skip, take },
    });

    return response.data;
  },
};
