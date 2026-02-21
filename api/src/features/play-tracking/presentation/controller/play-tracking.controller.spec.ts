import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { PlayTrackingController } from './play-tracking.controller';
import {
  RecordPlayUseCase,
  RecordSkipUseCase,
  GetUserPlayHistoryUseCase,
  GetUserTopTracksUseCase,
  GetRecentlyPlayedUseCase,
  GetUserPlaySummaryUseCase,
  UpdatePlaybackStateUseCase,
} from '../../domain/use-cases';
import { RequestWithUser } from '@shared/types/request.types';
import { RecordPlayDto, RecordSkipDto, UpdatePlaybackStateDto } from '../dtos/play-tracking.dto';

describe('PlayTrackingController', () => {
  let controller: PlayTrackingController;
  let recordPlayUseCase: jest.Mocked<RecordPlayUseCase>;
  let recordSkipUseCase: jest.Mocked<RecordSkipUseCase>;
  let getUserPlayHistoryUseCase: jest.Mocked<GetUserPlayHistoryUseCase>;
  let getUserTopTracksUseCase: jest.Mocked<GetUserTopTracksUseCase>;
  let getRecentlyPlayedUseCase: jest.Mocked<GetRecentlyPlayedUseCase>;
  let getUserPlaySummaryUseCase: jest.Mocked<GetUserPlaySummaryUseCase>;
  let updatePlaybackStateUseCase: jest.Mocked<UpdatePlaybackStateUseCase>;

  const mockUser = { id: 'user-1', username: 'testuser' };

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayTrackingController],
      providers: [
        { provide: RecordPlayUseCase, useValue: { execute: jest.fn() } },
        { provide: RecordSkipUseCase, useValue: { execute: jest.fn() } },
        { provide: GetUserPlayHistoryUseCase, useValue: { execute: jest.fn() } },
        { provide: GetUserTopTracksUseCase, useValue: { execute: jest.fn() } },
        { provide: GetRecentlyPlayedUseCase, useValue: { execute: jest.fn() } },
        { provide: GetUserPlaySummaryUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdatePlaybackStateUseCase, useValue: { execute: jest.fn() } },
        { provide: getLoggerToken(PlayTrackingController.name), useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<PlayTrackingController>(PlayTrackingController);
    recordPlayUseCase = module.get(RecordPlayUseCase);
    recordSkipUseCase = module.get(RecordSkipUseCase);
    getUserPlayHistoryUseCase = module.get(GetUserPlayHistoryUseCase);
    getUserTopTracksUseCase = module.get(GetUserTopTracksUseCase);
    getRecentlyPlayedUseCase = module.get(GetRecentlyPlayedUseCase);
    getUserPlaySummaryUseCase = module.get(GetUserPlaySummaryUseCase);
    updatePlaybackStateUseCase = module.get(UpdatePlaybackStateUseCase);
  });

  describe('recordPlay', () => {
    it('should record a play event and return the response', async () => {
      const mockPlayEvent = {
        id: 'play-1',
        userId: 'user-1',
        trackId: 'track-1',
        playedAt: new Date('2025-01-01'),
        client: 'test-agent',
        playContext: 'album',
        completionRate: 0.95,
        skipped: false,
        sourceId: 'album-1',
        sourceType: 'album',
        createdAt: new Date('2025-01-01'),
      };

      recordPlayUseCase.execute.mockResolvedValue(mockPlayEvent);

      const dto = {
        trackId: 'track-1',
        playContext: 'album',
        completionRate: 0.95,
        sourceId: 'album-1',
        sourceType: 'album',
      };
      const req = {
        user: mockUser,
        headers: { 'user-agent': 'test-agent' },
      } as unknown as RequestWithUser;

      const result = await controller.recordPlay(dto as RecordPlayDto, req);

      expect(recordPlayUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-1',
        trackId: 'track-1',
        playContext: 'album',
        completionRate: 0.95,
        sourceId: 'album-1',
        sourceType: 'album',
        client: 'test-agent',
      });
      expect(result.id).toBe('play-1');
      expect(result.trackId).toBe('track-1');
    });
  });

  describe('recordSkip', () => {
    it('should record a skip event and return the response', async () => {
      const mockSkipEvent = {
        id: 'skip-1',
        userId: 'user-1',
        trackId: 'track-1',
        playedAt: new Date('2025-01-01'),
        client: null,
        playContext: 'playlist',
        completionRate: 0.2,
        skipped: true,
        sourceId: null,
        sourceType: null,
        createdAt: new Date('2025-01-01'),
      };

      recordSkipUseCase.execute.mockResolvedValue(mockSkipEvent);

      const dto = { trackId: 'track-1', completionRate: 0.2, playContext: 'playlist' };
      const req = { user: mockUser } as unknown as RequestWithUser;

      const result = await controller.recordSkip(dto as RecordSkipDto, req);

      expect(recordSkipUseCase.execute).toHaveBeenCalledWith('user-1', 'track-1', 0.2, 'playlist');
      expect(result.skipped).toBe(true);
    });
  });

  describe('getPlayHistory', () => {
    it('should return user play history', async () => {
      const mockHistory = [
        {
          id: 'play-1',
          userId: 'user-1',
          trackId: 'track-1',
          playedAt: new Date('2025-01-01'),
          client: 'web',
          playContext: 'album',
          completionRate: 1,
          skipped: false,
          sourceId: null,
          sourceType: null,
          createdAt: new Date('2025-01-01'),
        },
      ];

      getUserPlayHistoryUseCase.execute.mockResolvedValue(mockHistory);

      const req = { user: mockUser } as unknown as RequestWithUser;
      const result = await controller.getPlayHistory(50, 0, req);

      expect(getUserPlayHistoryUseCase.execute).toHaveBeenCalledWith('user-1', 50, 0);
      expect(result).toHaveLength(1);
      expect(result[0].trackId).toBe('track-1');
    });
  });

  describe('getTopTracks', () => {
    it('should return user top tracks', async () => {
      const mockTopTracks = [
        { trackId: 'track-1', title: 'Song', playCount: 10, weightedScore: 8.5 },
      ];

      getUserTopTracksUseCase.execute.mockResolvedValue(mockTopTracks);

      const req = { user: mockUser } as unknown as RequestWithUser;
      const result = await controller.getTopTracks(req, 50, undefined);

      expect(getUserTopTracksUseCase.execute).toHaveBeenCalledWith('user-1', 50, undefined);
      expect(result).toHaveLength(1);
    });
  });

  describe('getRecentlyPlayed', () => {
    it('should return recently played track IDs', async () => {
      getRecentlyPlayedUseCase.execute.mockResolvedValue(['track-1', 'track-2']);

      const req = { user: mockUser } as unknown as RequestWithUser;
      const result = await controller.getRecentlyPlayed(20, req);

      expect(getRecentlyPlayedUseCase.execute).toHaveBeenCalledWith('user-1', 20);
      expect(result).toEqual(['track-1', 'track-2']);
    });
  });

  describe('getPlaySummary', () => {
    it('should return user play summary', async () => {
      const mockSummary = {
        totalPlays: 100,
        totalSkips: 10,
        avgCompletionRate: 0.85,
        topContext: 'album',
        playsByContext: { album: 60, playlist: 30, search: 10 },
        recentPlays: [],
      };

      getUserPlaySummaryUseCase.execute.mockResolvedValue(mockSummary);

      const req = { user: mockUser } as unknown as RequestWithUser;
      const result = await controller.getPlaySummary(30, req);

      expect(getUserPlaySummaryUseCase.execute).toHaveBeenCalledWith('user-1', 30);
      expect(result.totalPlays).toBe(100);
      expect(result.avgCompletionRate).toBe(0.85);
    });
  });

  describe('updatePlaybackState', () => {
    it('should update playback state', async () => {
      updatePlaybackStateUseCase.execute.mockResolvedValue(undefined);

      const dto = { isPlaying: true, currentTrackId: 'track-1' };
      const req = { user: mockUser } as unknown as RequestWithUser;

      await controller.updatePlaybackState(dto as UpdatePlaybackStateDto, req);

      expect(updatePlaybackStateUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-1',
        isPlaying: true,
        currentTrackId: 'track-1',
      });
    });
  });
});
