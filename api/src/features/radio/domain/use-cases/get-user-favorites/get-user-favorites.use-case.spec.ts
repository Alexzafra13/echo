import { Test, TestingModule } from '@nestjs/testing';
import { GetUserFavoritesUseCase } from './get-user-favorites.use-case';
import {
  IRadioStationRepository,
  RADIO_STATION_REPOSITORY,
} from '../../ports/radio-station-repository.port';
import { RadioStation } from '../../entities/radio-station.entity';

describe('GetUserFavoritesUseCase', () => {
  let useCase: GetUserFavoritesUseCase;
  let repository: jest.Mocked<IRadioStationRepository>;

  const mockStations: RadioStation[] = [
    RadioStation.reconstruct({
      id: 'station-1',
      userId: 'user-1',
      stationUuid: 'station-uuid-1',
      name: 'Rock FM',
      url: 'http://stream.rockfm.com',
      source: 'radio-browser',
      isFavorite: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    RadioStation.reconstruct({
      id: 'station-2',
      userId: 'user-1',
      name: 'My Local Radio',
      url: 'http://myradio.local:8000/stream',
      source: 'custom',
      isFavorite: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  ];

  beforeEach(async () => {
    const mockRepository: Partial<IRadioStationRepository> = {
      findByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserFavoritesUseCase,
        {
          provide: RADIO_STATION_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetUserFavoritesUseCase>(GetUserFavoritesUseCase);
    repository = module.get(RADIO_STATION_REPOSITORY);
  });

  describe('execute', () => {
    it('should return favorite stations for a user', async () => {
      (repository.findByUserId as jest.Mock).mockResolvedValue(mockStations);

      const result = await useCase.execute('user-1');

      expect(repository.findByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockStations);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when user has no favorites', async () => {
      (repository.findByUserId as jest.Mock).mockResolvedValue([]);

      const result = await useCase.execute('user-no-favorites');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return stations with correct properties', async () => {
      (repository.findByUserId as jest.Mock).mockResolvedValue([mockStations[0]]);

      const result = await useCase.execute('user-1');

      expect(result[0].id).toBe('station-1');
      expect(result[0].name).toBe('Rock FM');
      expect(result[0].url).toBe('http://stream.rockfm.com');
      expect(result[0].source).toBe('radio-browser');
      expect(result[0].isFavorite).toBe(true);
    });

    it('should propagate repository errors', async () => {
      (repository.findByUserId as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(useCase.execute('user-1')).rejects.toThrow('Database error');
    });
  });
});
