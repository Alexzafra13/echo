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
 * Response from DJ shuffle endpoint (includes djMode flag)
 */
export interface DjShuffledTracksResponse extends ShuffledTracksResponse {
  /** Whether DJ-aware ordering was used (true) or fallback to random (false) */
  djMode: boolean;
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

  /**
   * Get tracks with DJ-aware ordering (harmonic mixing)
   * Falls back to random if not enough tracks have DJ analysis
   *
   * @param params - Optional parameters for seed and pagination
   * @returns Response with djMode indicating if DJ ordering was used
   */
  getDjShuffled: async (params?: ShuffleParams): Promise<DjShuffledTracksResponse> => {
    const response = await apiClient.get<DjShuffledTracksResponse>('/tracks/shuffle/dj', {
      params,
    });
    return response.data;
  },
};
