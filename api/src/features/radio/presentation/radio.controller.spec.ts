import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { RadioController } from './radio.controller';
import { SaveFavoriteStationUseCase } from '../domain/use-cases/save-favorite-station/save-favorite-station.use-case';
import { GetUserFavoritesUseCase } from '../domain/use-cases/get-user-favorites/get-user-favorites.use-case';
import { DeleteFavoriteStationUseCase } from '../domain/use-cases/delete-favorite-station/delete-favorite-station.use-case';
import { SearchStationsUseCase } from '../domain/use-cases/search-stations/search-stations.use-case';
import { IcyMetadataService } from '../domain/services/icy-metadata.service';
import { RadioStation } from '../domain/entities/radio-station.entity';

const createMockStation = (overrides: Partial<any> = {}) =>
  RadioStation.reconstruct({
    id: 'station-1',
    userId: 'user-1',
    name: 'My Station',
    url: 'http://stream.example.com',
    source: 'radio-browser' as const,
    isFavorite: true,
    tags: 'rock,pop',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('RadioController', () => {
  let controller: RadioController;
  let searchStationsUseCase: jest.Mocked<SearchStationsUseCase>;
  let saveFavoriteUseCase: jest.Mocked<SaveFavoriteStationUseCase>;
  let getUserFavoritesUseCase: jest.Mocked<GetUserFavoritesUseCase>;
  let deleteFavoriteUseCase: jest.Mocked<DeleteFavoriteStationUseCase>;

  const mockUser = { id: 'user-1', username: 'testuser' };

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RadioController],
      providers: [
        {
          provide: SaveFavoriteStationUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetUserFavoritesUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: DeleteFavoriteStationUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: SearchStationsUseCase,
          useValue: {
            execute: jest.fn(),
            getTopVoted: jest.fn(),
            getPopular: jest.fn(),
            getByCountry: jest.fn(),
            getByTag: jest.fn(),
            getTags: jest.fn(),
            getCountries: jest.fn(),
          },
        },
        {
          provide: IcyMetadataService,
          useValue: { subscribe: jest.fn(), unsubscribe: jest.fn() },
        },
        { provide: getLoggerToken(RadioController.name), useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<RadioController>(RadioController);
    searchStationsUseCase = module.get(SearchStationsUseCase);
    saveFavoriteUseCase = module.get(SaveFavoriteStationUseCase);
    getUserFavoritesUseCase = module.get(GetUserFavoritesUseCase);
    deleteFavoriteUseCase = module.get(DeleteFavoriteStationUseCase);
  });

  describe('searchStations', () => {
    it('should search stations with query params', async () => {
      const mockStations = [
        { name: 'Rock FM', url: 'http://rock.fm/stream', tags: 'rock' },
      ];
      searchStationsUseCase.execute.mockResolvedValue(mockStations);

      const query = { name: 'Rock', limit: 10 };
      const result = await controller.searchStations(query as any);

      expect(searchStationsUseCase.execute).toHaveBeenCalledWith(query);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Rock FM');
    });
  });

  describe('getTopVoted', () => {
    it('should return top voted stations', async () => {
      const mockStations = [{ name: 'Best FM' }];
      (searchStationsUseCase as any).getTopVoted.mockResolvedValue(mockStations);

      const result = await controller.getTopVoted(10);

      expect(searchStationsUseCase.getTopVoted).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
    });

    it('should default to 20 if no limit provided', async () => {
      (searchStationsUseCase as any).getTopVoted.mockResolvedValue([]);

      await controller.getTopVoted(undefined);

      expect(searchStationsUseCase.getTopVoted).toHaveBeenCalledWith(20);
    });
  });

  describe('getPopular', () => {
    it('should return popular stations', async () => {
      (searchStationsUseCase as any).getPopular.mockResolvedValue([]);

      const result = await controller.getPopular(15);

      expect(searchStationsUseCase.getPopular).toHaveBeenCalledWith(15);
      expect(result).toEqual([]);
    });
  });

  describe('getByCountry', () => {
    it('should return stations by country code', async () => {
      const mockStations = [{ name: 'Local FM', country: 'US' }];
      (searchStationsUseCase as any).getByCountry.mockResolvedValue(mockStations);

      const result = await controller.getByCountry('US', 50);

      expect(searchStationsUseCase.getByCountry).toHaveBeenCalledWith('US', 50);
      expect(result).toHaveLength(1);
    });
  });

  describe('getByTag', () => {
    it('should return stations by tag', async () => {
      (searchStationsUseCase as any).getByTag.mockResolvedValue([]);

      const result = await controller.getByTag('jazz', 30);

      expect(searchStationsUseCase.getByTag).toHaveBeenCalledWith('jazz', 30);
      expect(result).toEqual([]);
    });
  });

  describe('getTags', () => {
    it('should return available tags', async () => {
      const mockTags = [{ name: 'rock', stationcount: 1000 }];
      (searchStationsUseCase as any).getTags.mockResolvedValue(mockTags);

      const result = await controller.getTags(100);

      expect(searchStationsUseCase.getTags).toHaveBeenCalledWith(100);
      expect(result).toHaveLength(1);
    });
  });

  describe('getCountries', () => {
    it('should return available countries', async () => {
      const mockCountries = [{ name: 'United States', stationcount: 5000 }];
      (searchStationsUseCase as any).getCountries.mockResolvedValue(mockCountries);

      const result = await controller.getCountries();

      expect(searchStationsUseCase.getCountries).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('getFavorites', () => {
    it('should return user favorite stations', async () => {
      const mockStations = [createMockStation()];
      getUserFavoritesUseCase.execute.mockResolvedValue(mockStations as any);

      const result = await controller.getFavorites('user-1');

      expect(getUserFavoritesUseCase.execute).toHaveBeenCalledWith('user-1');
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });
  });

  describe('saveFavoriteFromApi', () => {
    it('should save a station from Radio Browser as favorite', async () => {
      const mockStation = createMockStation({ name: 'Saved Station' });
      saveFavoriteUseCase.execute.mockResolvedValue(mockStation as any);

      const dto = {
        stationuuid: 'ext-123',
        name: 'Saved Station',
        url: 'http://stream.example.com',
      };

      const result = await controller.saveFavoriteFromApi('user-1', dto as any);

      expect(saveFavoriteUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-1',
        stationData: dto,
        isCustom: false,
      });
      expect(result).toBeDefined();
    });
  });

  describe('saveFavoriteCustom', () => {
    it('should save a custom station as favorite', async () => {
      const mockStation = createMockStation({ id: 'station-2', name: 'Custom Station', source: 'custom' as const });
      saveFavoriteUseCase.execute.mockResolvedValue(mockStation as any);

      const dto = {
        name: 'Custom Station',
        url: 'http://custom.example.com/stream',
      };

      const result = await controller.saveFavoriteCustom('user-1', dto as any);

      expect(saveFavoriteUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-1',
        stationData: {
          name: 'Custom Station',
          url: 'http://custom.example.com/stream',
          homepage: undefined,
          favicon: undefined,
          country: undefined,
          language: undefined,
          tags: undefined,
          codec: undefined,
          bitrate: undefined,
        },
        isCustom: true,
      });
      expect(result).toBeDefined();
    });
  });

  describe('deleteFavorite', () => {
    it('should delete a favorite station', async () => {
      deleteFavoriteUseCase.execute.mockResolvedValue(undefined);

      await controller.deleteFavorite('user-1', 'station-1');

      expect(deleteFavoriteUseCase.execute).toHaveBeenCalledWith({
        stationId: 'station-1',
        userId: 'user-1',
      });
    });
  });
});
