import { apiClient } from '@shared/services/api';
import type { SearchResponse, PaginationParams } from '@shared/types';
import type { Track } from '../types';

/**
 * Response from paginated shuffle endpoint
 */
export interface ShuffledTracksResponse {
  data: Track[];
  total: number;
  seed: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

/**
 * Parameters for shuffle endpoint
 */
export interface ShuffleParams {
  /** Seed for deterministic ordering (0-1). If not provided, generates new sequence */
  seed?: number;
  /** Number of tracks to skip */
  skip?: number;
  /** Number of tracks to return (max 100) */
  take?: number;
}

/**
 * Tracks API service
 * Handles all track-related API calls
 */
export const tracksService = {
  /**
   * Search tracks by query
   */
  search: async (query: string, params?: PaginationParams): Promise<Track[]> => {
    const response = await apiClient.get<SearchResponse<Track>>(
      `/tracks/search/${encodeURIComponent(query)}`,
      { params }
    );
    return response.data.data;
  },

  /**
   * Get tracks in random order with pagination
   *
   * @param params - Optional parameters for seed and pagination
   * @returns Paginated response with seed for continuing the same sequence
   */
  getShuffled: async (params?: ShuffleParams): Promise<ShuffledTracksResponse> => {
    const response = await apiClient.get<ShuffledTracksResponse>('/tracks/shuffle', {
      params,
    });
    return response.data;
  },
};
