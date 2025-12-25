import { SearchStationsUseCase } from './search-stations.use-case';
import {
  IRadioBrowserApiClient,
  RadioBrowserStation,
  RadioTag,
  RadioCountry,
} from '../../ports';

describe('SearchStationsUseCase', () => {
  let useCase: SearchStationsUseCase;
  let mockRadioBrowserApi: jest.Mocked<IRadioBrowserApiClient>;

  const mockStation: RadioBrowserStation = {
    stationuuid: 'station-123',
    name: 'Rock FM',
    url: 'http://stream.rockfm.com',
    url_resolved: 'http://stream.rockfm.com/live',
    homepage: 'https://rockfm.com',
    favicon: 'https://rockfm.com/logo.png',
    tags: 'rock,classic rock,metal',
    country: 'Spain',
    countrycode: 'ES',
    state: 'Madrid',
    language: 'spanish',
    languagecodes: 'es',
    votes: 1500,
    codec: 'MP3',
    bitrate: 128,
    hls: false,
    lastcheckok: true,
    lastchecktime: '2024-01-15T10:00:00Z',
    clickcount: 50000,
    clicktrend: 100,
    geo_lat: 40.4168,
    geo_long: -3.7038,
  };

  beforeEach(() => {
    mockRadioBrowserApi = {
      searchStations: jest.fn(),
      getTopVotedStations: jest.fn(),
      getPopularStations: jest.fn(),
      getStationsByCountry: jest.fn(),
      getStationsByTag: jest.fn(),
      searchByName: jest.fn(),
      getTags: jest.fn(),
      getCountries: jest.fn(),
      registerStationClick: jest.fn(),
    };

    useCase = new SearchStationsUseCase(mockRadioBrowserApi);
  });

  describe('execute', () => {
    it('should search stations with parameters', async () => {
      mockRadioBrowserApi.searchStations.mockResolvedValue([mockStation]);

      const result = await useCase.execute({
        name: 'rock',
        country: 'Spain',
        limit: 10,
      });

      expect(mockRadioBrowserApi.searchStations).toHaveBeenCalledWith({
        name: 'rock',
        country: 'Spain',
        limit: 10,
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Rock FM');
    });

    it('should return empty array when no stations found', async () => {
      mockRadioBrowserApi.searchStations.mockResolvedValue([]);

      const result = await useCase.execute({ name: 'nonexistent' });

      expect(result).toEqual([]);
    });
  });

  describe('getTopVoted', () => {
    it('should get top voted stations with default limit', async () => {
      mockRadioBrowserApi.getTopVotedStations.mockResolvedValue([mockStation]);

      const result = await useCase.getTopVoted();

      expect(mockRadioBrowserApi.getTopVotedStations).toHaveBeenCalledWith(20);
      expect(result).toHaveLength(1);
    });

    it('should get top voted stations with custom limit', async () => {
      mockRadioBrowserApi.getTopVotedStations.mockResolvedValue([mockStation]);

      await useCase.getTopVoted(50);

      expect(mockRadioBrowserApi.getTopVotedStations).toHaveBeenCalledWith(50);
    });
  });

  describe('getPopular', () => {
    it('should get popular stations with default limit', async () => {
      mockRadioBrowserApi.getPopularStations.mockResolvedValue([mockStation]);

      const result = await useCase.getPopular();

      expect(mockRadioBrowserApi.getPopularStations).toHaveBeenCalledWith(20);
      expect(result).toHaveLength(1);
    });
  });

  describe('getByCountry', () => {
    it('should get stations by country code', async () => {
      mockRadioBrowserApi.getStationsByCountry.mockResolvedValue([mockStation]);

      const result = await useCase.getByCountry('ES');

      expect(mockRadioBrowserApi.getStationsByCountry).toHaveBeenCalledWith('ES', 50);
      expect(result[0].countrycode).toBe('ES');
    });

    it('should use custom limit', async () => {
      mockRadioBrowserApi.getStationsByCountry.mockResolvedValue([]);

      await useCase.getByCountry('US', 100);

      expect(mockRadioBrowserApi.getStationsByCountry).toHaveBeenCalledWith('US', 100);
    });
  });

  describe('getByTag', () => {
    it('should get stations by tag', async () => {
      mockRadioBrowserApi.getStationsByTag.mockResolvedValue([mockStation]);

      const result = await useCase.getByTag('rock');

      expect(mockRadioBrowserApi.getStationsByTag).toHaveBeenCalledWith('rock', 50);
      expect(result[0].tags).toContain('rock');
    });
  });

  describe('searchByName', () => {
    it('should search stations by name', async () => {
      mockRadioBrowserApi.searchByName.mockResolvedValue([mockStation]);

      const result = await useCase.searchByName('Rock');

      expect(mockRadioBrowserApi.searchByName).toHaveBeenCalledWith('Rock', 20);
      expect(result[0].name).toBe('Rock FM');
    });
  });

  describe('getTags', () => {
    it('should get available tags', async () => {
      const mockTags: RadioTag[] = [
        { name: 'rock', stationcount: 5000 },
        { name: 'pop', stationcount: 8000 },
      ];
      mockRadioBrowserApi.getTags.mockResolvedValue(mockTags);

      const result = await useCase.getTags();

      expect(mockRadioBrowserApi.getTags).toHaveBeenCalledWith(100);
      expect(result).toHaveLength(2);
    });
  });

  describe('getCountries', () => {
    it('should get available countries', async () => {
      const mockCountries: RadioCountry[] = [
        { name: 'Spain', iso_3166_1: 'ES', stationcount: 500 },
        { name: 'United States', iso_3166_1: 'US', stationcount: 10000 },
      ];
      mockRadioBrowserApi.getCountries.mockResolvedValue(mockCountries);

      const result = await useCase.getCountries();

      expect(mockRadioBrowserApi.getCountries).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });
});
