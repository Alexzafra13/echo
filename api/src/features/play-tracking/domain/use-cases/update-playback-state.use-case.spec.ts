import { Test, TestingModule } from '@nestjs/testing';
import { UpdatePlaybackStateUseCase } from './update-playback-state.use-case';
import { IPlayTrackingRepository, PLAY_TRACKING_REPOSITORY } from '../ports';
import { ListeningNowService } from '../../../social/domain/services/listening-now.service';

describe('UpdatePlaybackStateUseCase', () => {
  let useCase: UpdatePlaybackStateUseCase;
  let repository: jest.Mocked<IPlayTrackingRepository>;
  let listeningNowService: jest.Mocked<ListeningNowService>;

  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const mockRepository: Partial<IPlayTrackingRepository> = {
      updatePlaybackState: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdatePlaybackStateUseCase,
        {
          provide: `PinoLogger:${UpdatePlaybackStateUseCase.name}`,
          useValue: mockLogger,
        },
        {
          provide: PLAY_TRACKING_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: ListeningNowService,
          useValue: { emitUpdate: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get<UpdatePlaybackStateUseCase>(UpdatePlaybackStateUseCase);
    repository = module.get(PLAY_TRACKING_REPOSITORY);
    listeningNowService = module.get(ListeningNowService);

    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should update playback state when playing with a track', async () => {
      (repository.updatePlaybackState as jest.Mock).mockResolvedValue(undefined);

      await useCase.execute({
        userId: 'user-1',
        isPlaying: true,
        currentTrackId: 'track-1',
      });

      expect(repository.updatePlaybackState).toHaveBeenCalledWith('user-1', true, 'track-1');
      expect(listeningNowService.emitUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          isPlaying: true,
          currentTrackId: 'track-1',
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should set isPlaying to false when undefined', async () => {
      (repository.updatePlaybackState as jest.Mock).mockResolvedValue(undefined);

      await useCase.execute({
        userId: 'user-1',
      });

      expect(repository.updatePlaybackState).toHaveBeenCalledWith('user-1', false, null);
      expect(listeningNowService.emitUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          isPlaying: false,
          currentTrackId: null,
        }),
      );
    });

    it('should set trackId to null when not playing', async () => {
      (repository.updatePlaybackState as jest.Mock).mockResolvedValue(undefined);

      await useCase.execute({
        userId: 'user-1',
        isPlaying: false,
        currentTrackId: 'track-1',
      });

      expect(repository.updatePlaybackState).toHaveBeenCalledWith('user-1', false, null);
      expect(listeningNowService.emitUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          isPlaying: false,
          currentTrackId: null,
        }),
      );
    });

    it('should set trackId to null when playing but no trackId provided', async () => {
      (repository.updatePlaybackState as jest.Mock).mockResolvedValue(undefined);

      await useCase.execute({
        userId: 'user-1',
        isPlaying: true,
      });

      expect(repository.updatePlaybackState).toHaveBeenCalledWith('user-1', true, null);
    });

    it('should call logger.debug with playback state', async () => {
      (repository.updatePlaybackState as jest.Mock).mockResolvedValue(undefined);

      await useCase.execute({
        userId: 'user-1',
        isPlaying: true,
        currentTrackId: 'track-1',
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { userId: 'user-1', isPlaying: true, currentTrackId: 'track-1' },
        'Updating playback state',
      );
    });

    it('should emit SSE update with timestamp', async () => {
      (repository.updatePlaybackState as jest.Mock).mockResolvedValue(undefined);

      await useCase.execute({
        userId: 'user-1',
        isPlaying: true,
        currentTrackId: 'track-1',
      });

      expect(listeningNowService.emitUpdate).toHaveBeenCalledTimes(1);
      const emitCall = (listeningNowService.emitUpdate as jest.Mock).mock.calls[0][0];
      expect(emitCall.timestamp).toBeInstanceOf(Date);
    });

    it('should propagate repository errors', async () => {
      (repository.updatePlaybackState as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        useCase.execute({ userId: 'user-1', isPlaying: true, currentTrackId: 'track-1' }),
      ).rejects.toThrow('Database error');
    });
  });
});
