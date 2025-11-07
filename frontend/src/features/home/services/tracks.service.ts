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
    const { data } = await apiClient.get<Track[]>(`/tracks/search/${encodeURIComponent(query)}`, {
      params,
    });
    return data;
  },
};
