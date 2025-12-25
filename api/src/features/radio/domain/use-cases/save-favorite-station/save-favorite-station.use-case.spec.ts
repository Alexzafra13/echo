import { SaveFavoriteStationUseCase } from './save-favorite-station.use-case';
import { IRadioStationRepository, IRadioBrowserApiClient } from '../../ports';
import { RadioStation } from '../../entities/radio-station.entity';

describe('SaveFavoriteStationUseCase', () => {
  let useCase: SaveFavoriteStationUseCase;
  let mockRepository: jest.Mocked<IRadioStationRepository>;
  let mockRadioBrowserApi: jest.Mocked<IRadioBrowserApiClient>;

  const mockStationData = {
    stationuuid: 'station-uuid-123',
    name: 'Rock FM',
    url: 'http://stream.rockfm.com',
    url_resolved: 'http://stream.rockfm.com/live',
    homepage: 'https://rockfm.com',
    favicon: 'https://rockfm.com/logo.png',
    country: 'Spain',
    countrycode: 'ES',
    tags: 'rock,classic rock',
    codec: 'MP3',
    bitrate: 128,
    votes: 1500,
    clickcount: 50000,
    lastcheckok: true,
  };

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByStationUuid: jest.fn(),
      findByUserId: jest.fn(),
      delete: jest.fn(),
      countByUserId: jest.fn(),
    };

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

    useCase = new SaveFavoriteStationUseCase(mockRepository, mockRadioBrowserApi);
  });

  describe('execute', () => {
    it('should save new station from Radio Browser API', async () => {
      mockRepository.findByStationUuid.mockResolvedValue(null);
      mockRadioBrowserApi.registerStationClick.mockResolvedValue(undefined);
      mockRepository.save.mockImplementation(async (station) => station);

      const result = await useCase.execute({
        userId: 'user-123',
        stationData: mockStationData,
        isCustom: false,
      });

      expect(mockRepository.findByStationUuid).toHaveBeenCalledWith(
        'user-123',
        'station-uuid-123',
      );
      expect(mockRadioBrowserApi.registerStationClick).toHaveBeenCalledWith('station-uuid-123');
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('Rock FM');
      expect(result.source).toBe('radio-browser');
    });

    it('should return existing station if already in favorites', async () => {
      const existingStation = RadioStation.reconstruct({
        id: 'existing-id',
        userId: 'user-123',
        stationUuid: 'station-uuid-123',
        name: 'Rock FM',
        url: 'http://stream.rockfm.com',
        source: 'radio-browser',
        isFavorite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepository.findByStationUuid.mockResolvedValue(existingStation);

      const result = await useCase.execute({
        userId: 'user-123',
        stationData: mockStationData,
        isCustom: false,
      });

      expect(result.id).toBe('existing-id');
      expect(mockRadioBrowserApi.registerStationClick).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should save custom station without Radio Browser integration', async () => {
      mockRepository.save.mockImplementation(async (station) => station);

      const result = await useCase.execute({
        userId: 'user-123',
        stationData: {
          name: 'My Local Radio',
          url: 'http://myradio.local:8000/stream',
        },
        isCustom: true,
      });

      expect(mockRepository.findByStationUuid).not.toHaveBeenCalled();
      expect(mockRadioBrowserApi.registerStationClick).not.toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('My Local Radio');
      expect(result.source).toBe('custom');
    });

    it('should handle station without uuid', async () => {
      mockRepository.save.mockImplementation(async (station) => station);

      const result = await useCase.execute({
        userId: 'user-123',
        stationData: {
          name: 'Unknown Station',
          url: 'http://unknown.stream/live',
        },
        isCustom: false,
      });

      expect(mockRepository.findByStationUuid).not.toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should set isFavorite to true for new stations', async () => {
      mockRepository.findByStationUuid.mockResolvedValue(null);
      mockRepository.save.mockImplementation(async (station) => station);

      const result = await useCase.execute({
        userId: 'user-123',
        stationData: mockStationData,
      });

      expect(result.isFavorite).toBe(true);
    });

    it('should preserve all station metadata from API', async () => {
      mockRepository.findByStationUuid.mockResolvedValue(null);
      mockRepository.save.mockImplementation(async (station) => station);

      const result = await useCase.execute({
        userId: 'user-123',
        stationData: mockStationData,
      });

      expect(result.country).toBe('Spain');
      expect(result.countryCode).toBe('ES');
      expect(result.tags).toBe('rock,classic rock');
      expect(result.codec).toBe('MP3');
      expect(result.bitrate).toBe(128);
    });
  });
});
