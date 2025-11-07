import { apiClient } from '@shared/services/api';
import type { Track } from '../types';

/**
 * Tracks API service
 * Handles all track-related API calls
 */
export const tracksService = {
  /**
   * Search tracks by query
   */
  search: async (query: string, params?: { skip?: number; take?: number }): Promise<Track[]> => {
    const response = await apiClient.get<{
      data: Track[];
      total: number;
      skip: number;
      take: number;
      query: string;
      hasMore: boolean;
    }>(`/tracks/search/${encodeURIComponent(query)}`, {
      params,
    });
    return response.data.data; // Extract the tracks array from the response
  },
};
