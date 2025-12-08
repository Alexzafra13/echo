import { apiClient } from '@shared/services/api';
import type { PaginatedResponse, SearchResponse, PaginationParams } from '@shared/types';
import type {
  Album,
  Track,
  AlbumsAlphabeticalResponse,
  AlbumsByArtistResponse,
  AlbumsRecentlyPlayedResponse,
  AlbumsFavoritesResponse
} from '../types';

/**
 * Albums API service
 * Handles all album-related API calls
 */
export const albumsService = {
  /**
   * Get recently added albums
   */
  getRecent: async (take?: number): Promise<Album[]> => {
    const { data } = await apiClient.get<Album[]>('/albums/recent', {
      params: take ? { take } : undefined,
    });
    return data;
  },

  /**
   * Get top played albums based on play statistics
   */
  getTopPlayed: async (take?: number): Promise<Album[]> => {
    const { data } = await apiClient.get<Album[]>('/albums/top-played', {
      params: take ? { take } : undefined,
    });
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
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Album>> => {
    const { data } = await apiClient.get<PaginatedResponse<Album>>('/albums', { params });
    return data;
  },

  /**
   * Search albums by query
   */
  search: async (query: string): Promise<Album[]> => {
    const response = await apiClient.get<SearchResponse<Album>>(
      `/albums/search/${encodeURIComponent(query)}`
    );
    return response.data.data; // Extract the albums array from the response
  },

  /**
   * Get all tracks for a specific album
   */
  getAlbumTracks: async (albumId: string): Promise<Track[]> => {
    const { data } = await apiClient.get<Track[]>(`/albums/${albumId}/tracks`);
    return data;
  },

  /**
   * Get albums sorted alphabetically (A-Z)
   */
  getAlphabetically: async (params?: { page?: number; limit?: number }): Promise<AlbumsAlphabeticalResponse> => {
    const { data } = await apiClient.get<AlbumsAlphabeticalResponse>('/albums/alphabetical', {
      params,
    });
    return data;
  },

  /**
   * Get albums sorted by artist name
   */
  getByArtist: async (params?: { page?: number; limit?: number }): Promise<AlbumsByArtistResponse> => {
    const { data } = await apiClient.get<AlbumsByArtistResponse>('/albums/by-artist', {
      params,
    });
    return data;
  },

  /**
   * Get recently played albums for the authenticated user
   */
  getRecentlyPlayed: async (limit?: number): Promise<AlbumsRecentlyPlayedResponse> => {
    const { data } = await apiClient.get<AlbumsRecentlyPlayedResponse>('/albums/recently-played', {
      params: limit ? { limit } : undefined,
    });
    return data;
  },

  /**
   * Get favorite albums for the authenticated user
   */
  getFavorites: async (params?: { page?: number; limit?: number }): Promise<AlbumsFavoritesResponse> => {
    const { data } = await apiClient.get<AlbumsFavoritesResponse>('/albums/favorites', {
      params,
    });
    return data;
  },
};
