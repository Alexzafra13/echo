import { apiClient } from '@shared/services/api';
import type { Album, Track } from '../types';

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
  getAll: async (params?: { skip?: number; take?: number }): Promise<{
    data: Album[];
    total: number;
    skip: number;
    take: number;
    hasMore: boolean;
  }> => {
    const { data } = await apiClient.get<{
      data: Album[];
      total: number;
      skip: number;
      take: number;
      hasMore: boolean;
    }>('/albums', { params });
    return data;
  },

  /**
   * Search albums by query
   */
  search: async (query: string): Promise<Album[]> => {
    const response = await apiClient.get<{
      data: Album[];
      total: number;
      skip: number;
      take: number;
      query: string;
      hasMore: boolean;
    }>(`/albums/search/${encodeURIComponent(query)}`);
    return response.data.data; // Extract the albums array from the response
  },

  /**
   * Get all tracks for a specific album
   */
  getAlbumTracks: async (albumId: string): Promise<Track[]> => {
    const { data } = await apiClient.get<Track[]>(`/albums/${albumId}/tracks`);
    return data;
  },
};
