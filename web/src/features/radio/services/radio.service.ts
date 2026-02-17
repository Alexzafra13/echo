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

export const radioService = {
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

  getTopVoted: async (limit: number = 20): Promise<RadioBrowserStation[]> => {
    const { data } = await apiClient.get<RadioBrowserStation[]>('/radio/top-voted', {
      params: { limit },
    });
    return data;
  },

  getPopular: async (limit: number = 20): Promise<RadioBrowserStation[]> => {
    const { data } = await apiClient.get<RadioBrowserStation[]>('/radio/popular', {
      params: { limit },
    });
    return data;
  },

  getByCountry: async (countryCode: string, limit: number = 50): Promise<RadioBrowserStation[]> => {
    const { data } = await apiClient.get<RadioBrowserStation[]>(
      `/radio/by-country/${countryCode}`,
      { params: { limit } }
    );
    return data;
  },

  getByTag: async (tag: string, limit: number = 50): Promise<RadioBrowserStation[]> => {
    const { data } = await apiClient.get<RadioBrowserStation[]>(
      `/radio/by-tag/${encodeURIComponent(tag)}`,
      { params: { limit } }
    );
    return data;
  },

  getTags: async (limit: number = 100): Promise<RadioBrowserTag[]> => {
    const { data } = await apiClient.get<RadioBrowserTag[]>('/radio/tags', {
      params: { limit },
    });
    return data;
  },

  getCountries: async (): Promise<RadioBrowserCountry[]> => {
    const { data } = await apiClient.get<RadioBrowserCountry[]>('/radio/countries');
    return data;
  },

  getFavorites: async (): Promise<RadioStation[]> => {
    const { data } = await apiClient.get<RadioStation[]>('/radio/favorites');
    return data;
  },

  saveFavoriteFromApi: async (stationData: SaveApiStationDto): Promise<RadioStation> => {
    const { data } = await apiClient.post<RadioStation>('/radio/favorites/from-api', stationData);
    return data;
  },

  createCustomStation: async (stationData: CreateCustomStationDto): Promise<RadioStation> => {
    const { data } = await apiClient.post<RadioStation>('/radio/favorites/custom', stationData);
    return data;
  },

  deleteFavorite: async (stationId: string): Promise<void> => {
    await apiClient.delete(`/radio/favorites/${stationId}`);
  },

  isInFavorites: async (stationUuid: string): Promise<boolean> => {
    try {
      const favorites = await radioService.getFavorites();
      return favorites.some(fav => fav.stationUuid === stationUuid);
    } catch {
      return false;
    }
  },

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
