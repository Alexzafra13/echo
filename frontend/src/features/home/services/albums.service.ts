import { apiClient } from '@shared/services/api';
import type { Album } from '../types';

/**
 * Albums API service
 * Handles all album-related API calls
 */
export const albumsService = {
  /**
   * Get recently added albums
   */
  getRecent: async (): Promise<Album[]> => {
    const { data } = await apiClient.get<Album[]>('/albums/recent');
    return data;
  },

  /**
   * Get featured album for hero section
   */
  getFeatured: async (): Promise<Album> => {
    const { data } = await apiClient.get<Album>('/albums/featured');
    return data;
  },

  /**
   * Get album by ID
   */
  getById: async (id: string): Promise<Album> => {
    const { data } = await apiClient.get<Album>(`/albums/${id}`);
    return data;
  },

  /**
   * Get all albums with optional pagination
   */
  getAll: async (params?: { page?: number; limit?: number }): Promise<Album[]> => {
    const { data } = await apiClient.get<Album[]>('/albums', { params });
    return data;
  },

  /**
   * Search albums by query
   */
  search: async (query: string): Promise<Album[]> => {
    const { data } = await apiClient.get<Album[]>('/albums/search', {
      params: { q: query },
    });
    return data;
  },
};
