import { Test, TestingModule } from '@nestjs/testing';
import { DeleteFavoriteStationUseCase } from './delete-favorite-station.use-case';
import {
  IRadioStationRepository,
  RADIO_STATION_REPOSITORY,
} from '../../ports/radio-station-repository.port';
import { RadioStation } from '../../entities/radio-station.entity';
import { NotFoundError, ForbiddenError } from '@shared/errors';

describe('DeleteFavoriteStationUseCase', () => {
  let useCase: DeleteFavoriteStationUseCase;
  let repository: jest.Mocked<IRadioStationRepository>;

  const mockStation = RadioStation.reconstruct({
    id: 'station-1',
    userId: 'user-1',
    stationUuid: 'station-uuid-1',
    name: 'Rock FM',
    url: 'http://stream.rockfm.com',
    source: 'radio-browser',
    isFavorite: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const mockRepository: Partial<IRadioStationRepository> = {
      findById: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteFavoriteStationUseCase,
        {
          provide: RADIO_STATION_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<DeleteFavoriteStationUseCase>(DeleteFavoriteStationUseCase);
    repository = module.get(RADIO_STATION_REPOSITORY);
  });

  describe('execute', () => {
    it('should delete a favorite station owned by the user', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockStation);
      (repository.delete as jest.Mock).mockResolvedValue(undefined);

      await useCase.execute({ stationId: 'station-1', userId: 'user-1' });

      expect(repository.findById).toHaveBeenCalledWith('station-1');
      expect(repository.delete).toHaveBeenCalledWith('station-1');
    });

    it('should throw NotFoundError when station does not exist', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        useCase.execute({ stationId: 'nonexistent', userId: 'user-1' }),
      ).rejects.toThrow(NotFoundError);

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when station belongs to another user', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockStation);

      await expect(
        useCase.execute({ stationId: 'station-1', userId: 'other-user' }),
      ).rejects.toThrow(ForbiddenError);

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      (repository.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        useCase.execute({ stationId: 'station-1', userId: 'user-1' }),
      ).rejects.toThrow('Database error');
    });
  });
});
