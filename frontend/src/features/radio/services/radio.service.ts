import { apiClient } from '@shared/services/api';
import type {
  RadioStation,
  RadioBrowserStation,
  RadioBrowserTag,
  RadioBrowserCountry,
  SearchStationsParams,
  SaveApiStationDto,
  CreateCustomStationDto,
} from '../types/radio.types';

/**
 * Radio service
 * Handles all radio-related API calls
 * - Uses apiClient for our backend endpoints (favorites CRUD)
 * - Uses native fetch for Radio Browser API (no external dependencies)
 */
export const radioService = {
  // ============================================
  // Radio Browser API endpoints (native fetch)
  // ============================================

  /**
   * Search stations in Radio Browser API
   */
  searchStations: async (params: SearchStationsParams): Promise<RadioBrowserStation[]> => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const { data } = await apiClient.get<RadioBrowserStation[]>(
      `/radio/search?${queryParams.toString()}`
    );
    return data;
  },

  /**
   * Get top voted stations
   */
  getTopVoted: async (limit: number = 20): Promise<RadioBrowserStation[]> => {
    const { data } = await apiClient.get<RadioBrowserStation[]>('/radio/top-voted', {
      params: { limit },
    });
    return data;
  },

  /**
   * Get popular stations
   */
  getPopular: async (limit: number = 20): Promise<RadioBrowserStation[]> => {
    const { data } = await apiClient.get<RadioBrowserStation[]>('/radio/popular', {
      params: { limit },
    });
    return data;
  },

  /**
   * Get stations by country
   */
  getByCountry: async (countryCode: string, limit: number = 50): Promise<RadioBrowserStation[]> => {
    const { data } = await apiClient.get<RadioBrowserStation[]>(
      `/radio/by-country/${countryCode}`,
      { params: { limit } }
    );
    return data;
  },

  /**
   * Get stations by tag (genre)
   */
  getByTag: async (tag: string, limit: number = 50): Promise<RadioBrowserStation[]> => {
    const { data } = await apiClient.get<RadioBrowserStation[]>(
      `/radio/by-tag/${encodeURIComponent(tag)}`,
      { params: { limit } }
    );
    return data;
  },

  /**
   * Get available tags (genres)
   */
  getTags: async (limit: number = 100): Promise<RadioBrowserTag[]> => {
    const { data } = await apiClient.get<RadioBrowserTag[]>('/radio/tags', {
      params: { limit },
    });
    return data;
  },

  /**
   * Get available countries
   */
  getCountries: async (): Promise<RadioBrowserCountry[]> => {
    const { data } = await apiClient.get<RadioBrowserCountry[]>('/radio/countries');
    return data;
  },

  // ============================================
  // Favorites endpoints (our backend)
  // ============================================

  /**
   * Get user's favorite stations
   */
  getFavorites: async (): Promise<RadioStation[]> => {
    const { data } = await apiClient.get<RadioStation[]>('/radio/favorites');
    return data;
  },

  /**
   * Save a station from Radio Browser API as favorite
   */
  saveFavoriteFromApi: async (stationData: SaveApiStationDto): Promise<RadioStation> => {
    const { data } = await apiClient.post<RadioStation>('/radio/favorites/from-api', stationData);
    return data;
  },

  /**
   * Create a custom radio station
   */
  createCustomStation: async (stationData: CreateCustomStationDto): Promise<RadioStation> => {
    const { data } = await apiClient.post<RadioStation>('/radio/favorites/custom', stationData);
    return data;
  },

  /**
   * Delete a favorite station
   */
  deleteFavorite: async (stationId: string): Promise<void> => {
    await apiClient.delete(`/radio/favorites/${stationId}`);
  },

  // ============================================
  // Utility methods
  // ============================================

  /**
   * Check if a station is already in favorites
   */
  isInFavorites: async (stationUuid: string): Promise<boolean> => {
    try {
      const favorites = await radioService.getFavorites();
      return favorites.some(fav => fav.stationUuid === stationUuid);
    } catch {
      return false;
    }
  },

  /**
   * Convert Radio Browser station to SaveApiStationDto
   */
  convertToSaveDto: (station: RadioBrowserStation): SaveApiStationDto => {
    return {
      stationuuid: station.stationuuid,
      name: station.name,
      url: station.url,
      url_resolved: station.url_resolved,
      homepage: station.homepage,
      favicon: station.favicon,
      country: station.country,
      countrycode: station.countrycode,
      state: station.state,
      language: station.language,
      tags: station.tags,
      codec: station.codec,
      bitrate: station.bitrate,
      votes: station.votes,
      clickcount: station.clickcount,
      lastcheckok: station.lastcheckok === 1,
    };
  },
};
