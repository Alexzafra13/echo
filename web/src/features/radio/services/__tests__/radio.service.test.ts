import { describe, it, expect, vi, beforeEach } from 'vitest';
import { radioService } from '../radio.service';
import { apiClient } from '@shared/services/api';
import type {
  RadioStation,
  RadioBrowserStation,
  RadioBrowserTag,
  RadioBrowserCountry,
} from '../../types/radio.types';

// Mock the api client
vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('radioService', () => {
  const mockRadioBrowserStation: RadioBrowserStation = {
    stationuuid: 'station-uuid-1',
    name: 'Test Radio',
    url: 'http://stream.test.com/radio',
    url_resolved: 'http://stream.test.com/radio.mp3',
    homepage: 'http://test.com',
    favicon: 'http://test.com/favicon.ico',
    tags: 'rock,alternative',
    country: 'Spain',
    countrycode: 'ES',
    state: 'Madrid',
    language: 'Spanish',
    languagecodes: 'es',
    votes: 100,
    lastchangetime: '2024-01-01',
    lastchangetime_iso8601: '2024-01-01T00:00:00Z',
    codec: 'MP3',
    bitrate: 128,
    hls: 0,
    lastcheckok: 1,
    lastchecktime: '2024-01-01',
    lastchecktime_iso8601: '2024-01-01T00:00:00Z',
    lastcheckoktime: '2024-01-01',
    lastcheckoktime_iso8601: '2024-01-01T00:00:00Z',
    lastlocalchecktime: '2024-01-01',
    lastlocalchecktime_iso8601: '2024-01-01T00:00:00Z',
    clicktimestamp: '2024-01-01',
    clicktimestamp_iso8601: '2024-01-01T00:00:00Z',
    clickcount: 500,
    clicktrend: 10,
    ssl_error: 0,
    geo_lat: 40.4168,
    geo_long: -3.7038,
    has_extended_info: false,
  };

  const mockRadioStation: RadioStation = {
    id: 'station-1',
    userId: 'user-1',
    stationUuid: 'station-uuid-1',
    name: 'My Favorite Radio',
    url: 'http://stream.test.com/radio',
    urlResolved: 'http://stream.test.com/radio.mp3',
    homepage: 'http://test.com',
    favicon: 'http://test.com/favicon.ico',
    country: 'Spain',
    countryCode: 'ES',
    tags: 'rock,alternative',
    codec: 'MP3',
    bitrate: 128,
    votes: 100,
    clickCount: 500,
    lastCheckOk: true,
    source: 'radio-browser',
    isFavorite: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchStations', () => {
    it('should search stations with name parameter', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockRadioBrowserStation] });

      const result = await radioService.searchStations({ name: 'rock' });

      expect(apiClient.get).toHaveBeenCalledWith('/radio/search?name=rock');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Radio');
    });

    it('should search with multiple parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await radioService.searchStations({
        name: 'jazz',
        country: 'Spain',
        limit: 20,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/radio/search?name=jazz&country=Spain&limit=20');
    });

    it('should ignore undefined parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await radioService.searchStations({
        name: 'rock',
        country: undefined,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/radio/search?name=rock');
    });
  });

  describe('getTopVoted', () => {
    it('should fetch top voted stations with default limit', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockRadioBrowserStation] });

      const result = await radioService.getTopVoted();

      expect(apiClient.get).toHaveBeenCalledWith('/radio/top-voted', {
        params: { limit: 20 },
      });
      expect(result).toHaveLength(1);
    });

    it('should fetch with custom limit', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await radioService.getTopVoted(50);

      expect(apiClient.get).toHaveBeenCalledWith('/radio/top-voted', {
        params: { limit: 50 },
      });
    });
  });

  describe('getPopular', () => {
    it('should fetch popular stations', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockRadioBrowserStation] });

      const result = await radioService.getPopular();

      expect(apiClient.get).toHaveBeenCalledWith('/radio/popular', {
        params: { limit: 20 },
      });
      expect(result[0].clickcount).toBe(500);
    });
  });

  describe('getByCountry', () => {
    it('should fetch stations by country code', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockRadioBrowserStation] });

      const result = await radioService.getByCountry('ES');

      expect(apiClient.get).toHaveBeenCalledWith('/radio/by-country/ES', {
        params: { limit: 50 },
      });
      expect(result[0].countrycode).toBe('ES');
    });

    it('should fetch with custom limit', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await radioService.getByCountry('US', 100);

      expect(apiClient.get).toHaveBeenCalledWith('/radio/by-country/US', {
        params: { limit: 100 },
      });
    });
  });

  describe('getByTag', () => {
    it('should fetch stations by tag', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockRadioBrowserStation] });

      const result = await radioService.getByTag('rock');

      expect(apiClient.get).toHaveBeenCalledWith('/radio/by-tag/rock', {
        params: { limit: 50 },
      });
      expect(result[0].tags).toContain('rock');
    });

    it('should encode special characters in tag', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await radioService.getByTag('hip hop');

      expect(apiClient.get).toHaveBeenCalledWith('/radio/by-tag/hip%20hop', {
        params: { limit: 50 },
      });
    });
  });

  describe('getTags', () => {
    it('should fetch available tags', async () => {
      const mockTags: RadioBrowserTag[] = [
        { name: 'rock', stationcount: 1000 },
        { name: 'pop', stationcount: 800 },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockTags });

      const result = await radioService.getTags();

      expect(apiClient.get).toHaveBeenCalledWith('/radio/tags', {
        params: { limit: 100 },
      });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('rock');
    });
  });

  describe('getCountries', () => {
    it('should fetch available countries', async () => {
      const mockCountries: RadioBrowserCountry[] = [
        { name: 'Spain', iso_3166_1: 'ES', stationcount: 500 },
        { name: 'United States', iso_3166_1: 'US', stationcount: 2000 },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockCountries });

      const result = await radioService.getCountries();

      expect(apiClient.get).toHaveBeenCalledWith('/radio/countries');
      expect(result).toHaveLength(2);
      expect(result[0].iso_3166_1).toBe('ES');
    });
  });

  describe('getFavorites', () => {
    it('should fetch user favorite stations', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockRadioStation] });

      const result = await radioService.getFavorites();

      expect(apiClient.get).toHaveBeenCalledWith('/radio/favorites');
      expect(result).toHaveLength(1);
      expect(result[0].isFavorite).toBe(true);
    });

    it('should handle empty favorites', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      const result = await radioService.getFavorites();

      expect(result).toHaveLength(0);
    });
  });

  describe('saveFavoriteFromApi', () => {
    it('should save a station from Radio Browser as favorite', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockRadioStation });

      const saveDto = radioService.convertToSaveDto(mockRadioBrowserStation);
      const result = await radioService.saveFavoriteFromApi(saveDto);

      expect(apiClient.post).toHaveBeenCalledWith('/radio/favorites/from-api', saveDto);
      expect(result.stationUuid).toBe('station-uuid-1');
    });
  });

  describe('createCustomStation', () => {
    it('should create a custom radio station', async () => {
      const customStation: RadioStation = {
        ...mockRadioStation,
        id: 'custom-1',
        stationUuid: null,
        source: 'custom',
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: customStation });

      const result = await radioService.createCustomStation({
        name: 'My Custom Radio',
        url: 'http://my-stream.com/radio',
        tags: 'custom,personal',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/radio/favorites/custom', {
        name: 'My Custom Radio',
        url: 'http://my-stream.com/radio',
        tags: 'custom,personal',
      });
      expect(result.source).toBe('custom');
    });
  });

  describe('deleteFavorite', () => {
    it('should delete a favorite station', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} });

      await radioService.deleteFavorite('station-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/radio/favorites/station-1');
    });

    it('should handle delete error', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Station not found' },
        },
      };
      vi.mocked(apiClient.delete).mockRejectedValueOnce(error);

      await expect(radioService.deleteFavorite('non-existent')).rejects.toEqual(error);
    });
  });

  describe('isInFavorites', () => {
    it('should return true if station is in favorites', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockRadioStation] });

      const result = await radioService.isInFavorites('station-uuid-1');

      expect(result).toBe(true);
    });

    it('should return false if station is not in favorites', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockRadioStation] });

      const result = await radioService.isInFavorites('other-uuid');

      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

      const result = await radioService.isInFavorites('station-uuid-1');

      expect(result).toBe(false);
    });
  });

  describe('convertToSaveDto', () => {
    it('should convert RadioBrowserStation to SaveApiStationDto', () => {
      const dto = radioService.convertToSaveDto(mockRadioBrowserStation);

      expect(dto.stationuuid).toBe('station-uuid-1');
      expect(dto.name).toBe('Test Radio');
      expect(dto.url).toBe('http://stream.test.com/radio');
      expect(dto.url_resolved).toBe('http://stream.test.com/radio.mp3');
      expect(dto.country).toBe('Spain');
      expect(dto.countrycode).toBe('ES');
      expect(dto.tags).toBe('rock,alternative');
      expect(dto.codec).toBe('MP3');
      expect(dto.bitrate).toBe(128);
      expect(dto.votes).toBe(100);
      expect(dto.clickcount).toBe(500);
      expect(dto.lastcheckok).toBe(true);
    });

    it('should handle lastcheckok = 0 as false', () => {
      const stationWithError = { ...mockRadioBrowserStation, lastcheckok: 0 };
      const dto = radioService.convertToSaveDto(stationWithError);

      expect(dto.lastcheckok).toBe(false);
    });
  });
});
