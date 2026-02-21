import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { RecommendationsController } from './recommendations.controller';
import {
  CalculateTrackScoreUseCase,
  GenerateDailyMixUseCase,
  GenerateSmartPlaylistUseCase,
  GetAutoPlaylistsUseCase,
} from '../../domain/use-cases';
import { WaveMixService } from '../../infrastructure/services/wave-mix.service';
import { TRACK_REPOSITORY } from '@features/tracks/domain/ports/track-repository.port';
import { RequestWithUser } from '@shared/types/request.types';
import {
  CalculateScoreDto,
  DailyMixConfigDto,
  SmartPlaylistConfigDto,
} from '../dtos/recommendations.dto';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let calculateTrackScoreUseCase: jest.Mocked<CalculateTrackScoreUseCase>;
  let generateDailyMixUseCase: jest.Mocked<GenerateDailyMixUseCase>;
  let generateSmartPlaylistUseCase: jest.Mocked<GenerateSmartPlaylistUseCase>;
  let getAutoPlaylistsUseCase: jest.Mocked<GetAutoPlaylistsUseCase>;
  let waveMixService: jest.Mocked<WaveMixService>;
  let trackRepository: { findByIds: jest.Mock };

  const mockUser = { id: 'user-1', username: 'testuser' };

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        { provide: CalculateTrackScoreUseCase, useValue: { execute: jest.fn() } },
        { provide: GenerateDailyMixUseCase, useValue: { execute: jest.fn() } },
        { provide: GenerateSmartPlaylistUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAutoPlaylistsUseCase, useValue: { execute: jest.fn() } },
        {
          provide: WaveMixService,
          useValue: {
            refreshAutoPlaylists: jest.fn(),
            getArtistPlaylistsPaginated: jest.fn(),
            getGenrePlaylistsPaginated: jest.fn(),
          },
        },
        {
          provide: TRACK_REPOSITORY,
          useValue: { findByIds: jest.fn() },
        },
        { provide: getLoggerToken(RecommendationsController.name), useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
    calculateTrackScoreUseCase = module.get(CalculateTrackScoreUseCase);
    generateDailyMixUseCase = module.get(GenerateDailyMixUseCase);
    generateSmartPlaylistUseCase = module.get(GenerateSmartPlaylistUseCase);
    getAutoPlaylistsUseCase = module.get(GetAutoPlaylistsUseCase);
    waveMixService = module.get(WaveMixService);
    trackRepository = module.get(TRACK_REPOSITORY);
  });

  describe('calculateScore', () => {
    it('should calculate track score and return the result', async () => {
      const mockScore = {
        trackId: 'track-1',
        totalScore: 85,
        rank: 1,
        breakdown: {
          explicitFeedback: 30,
          implicitBehavior: 25,
          recency: 20,
          diversity: 10,
        },
      };

      calculateTrackScoreUseCase.execute.mockResolvedValue(
        mockScore as ReturnType<CalculateTrackScoreUseCase['execute']> extends Promise<infer R>
          ? R
          : never
      );

      const dto = { trackId: 'track-1', artistId: 'artist-1' } as CalculateScoreDto;
      const req = { user: mockUser } as unknown as RequestWithUser;

      const result = await controller.calculateScore(dto, req);

      expect(calculateTrackScoreUseCase.execute).toHaveBeenCalledWith(
        'user-1',
        'track-1',
        'artist-1'
      );
      expect(result.trackId).toBe('track-1');
      expect(result.totalScore).toBe(85);
      expect(result.breakdown.explicitFeedback).toBe(30);
    });
  });

  describe('getDailyMix', () => {
    it('should generate and return a daily mix playlist', async () => {
      const mockDailyMix = {
        id: 'mix-1',
        type: 'daily_mix',
        userId: 'user-1',
        name: 'Daily Mix',
        description: 'Your personalized mix',
        tracks: [
          {
            trackId: 'track-1',
            totalScore: 90,
            rank: 1,
            breakdown: {
              explicitFeedback: 30,
              implicitBehavior: 30,
              recency: 20,
              diversity: 10,
            },
          },
        ],
        createdAt: new Date('2025-01-01'),
        expiresAt: new Date('2025-01-02'),
        metadata: {
          totalTracks: 1,
          avgScore: 90,
          topGenres: ['rock'],
          topArtists: ['artist-1'],
          temporalDistribution: {},
        },
        coverColor: '#FF0000',
        coverImageUrl: null,
      };

      generateDailyMixUseCase.execute.mockResolvedValue(
        mockDailyMix as ReturnType<GenerateDailyMixUseCase['execute']> extends Promise<infer R>
          ? R
          : never
      );

      const mockTrack = {
        toPrimitives: () => ({
          id: 'track-1',
          title: 'Test Song',
          artistName: 'Test Artist',
          albumName: 'Test Album',
          duration: 200,
          albumId: 'album-1',
          artistId: 'artist-1',
          rgTrackGain: null,
          rgTrackPeak: null,
          rgAlbumGain: null,
          rgAlbumPeak: null,
        }),
      };
      trackRepository.findByIds.mockResolvedValue([mockTrack]);

      const req = { user: mockUser } as unknown as RequestWithUser;
      const config = {} as DailyMixConfigDto;

      const result = await controller.getDailyMix(config, req);

      expect(generateDailyMixUseCase.execute).toHaveBeenCalledWith('user-1', config);
      expect(result.id).toBe('mix-1');
      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].track).toBeDefined();
      expect(result.tracks[0].track!.title).toBe('Test Song');
    });
  });

  describe('generateSmartPlaylist', () => {
    it('should generate a smart playlist', async () => {
      const mockPlaylist = {
        tracks: [
          {
            trackId: 'track-1',
            totalScore: 80,
            rank: 1,
            breakdown: {
              explicitFeedback: 20,
              implicitBehavior: 25,
              recency: 20,
              diversity: 15,
            },
          },
        ],
        metadata: {
          totalTracks: 1,
          avgScore: 80,
          config: { artistId: 'artist-1' },
        },
      };

      generateSmartPlaylistUseCase.execute.mockResolvedValue(
        mockPlaylist as ReturnType<GenerateSmartPlaylistUseCase['execute']> extends Promise<infer R>
          ? R
          : never
      );

      const mockTrack = {
        toPrimitives: () => ({
          id: 'track-1',
          title: 'Smart Song',
          artistName: 'Artist',
          albumName: 'Album',
          duration: 180,
          albumId: 'album-1',
          artistId: 'artist-1',
          rgTrackGain: null,
          rgTrackPeak: null,
          rgAlbumGain: null,
          rgAlbumPeak: null,
        }),
      };
      trackRepository.findByIds.mockResolvedValue([mockTrack]);

      const config = { artistId: 'artist-1', name: 'Artist Mix' } as SmartPlaylistConfigDto;
      const req = { user: mockUser } as unknown as RequestWithUser;

      const result = await controller.generateSmartPlaylist(config, req);

      expect(generateSmartPlaylistUseCase.execute).toHaveBeenCalledWith('user-1', config);
      expect(result.tracks).toHaveLength(1);
      expect(result.metadata.totalTracks).toBe(1);
    });
  });

  describe('getWaveMixPlaylists', () => {
    it('should return auto playlists enriched with tracks', async () => {
      const mockPlaylists = [
        {
          id: 'playlist-1',
          type: 'daily_mix',
          userId: 'user-1',
          name: 'Wave Mix',
          description: 'Auto generated',
          tracks: [],
          createdAt: new Date(),
          expiresAt: new Date(),
          metadata: {},
          coverColor: null,
          coverImageUrl: null,
        },
      ];

      getAutoPlaylistsUseCase.execute.mockResolvedValue(
        mockPlaylists as ReturnType<GetAutoPlaylistsUseCase['execute']> extends Promise<infer R>
          ? R
          : never
      );
      trackRepository.findByIds.mockResolvedValue([]);

      const req = { user: mockUser } as unknown as RequestWithUser;
      const result = await controller.getWaveMixPlaylists(req);

      expect(getAutoPlaylistsUseCase.execute).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('refreshWaveMix', () => {
    it('should force refresh wave mix playlists', async () => {
      waveMixService.refreshAutoPlaylists.mockResolvedValue([]);
      trackRepository.findByIds.mockResolvedValue([]);

      const req = { user: mockUser } as unknown as RequestWithUser;
      const result = await controller.refreshWaveMix(req);

      expect(waveMixService.refreshAutoPlaylists).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('getWaveMixArtistPlaylists', () => {
    it('should return paginated artist playlists', async () => {
      const mockResult = {
        playlists: [],
        total: 0,
        hasMore: false,
      };
      waveMixService.getArtistPlaylistsPaginated.mockResolvedValue(
        mockResult as ReturnType<WaveMixService['getArtistPlaylistsPaginated']> extends Promise<
          infer R
        >
          ? R
          : never
      );
      trackRepository.findByIds.mockResolvedValue([]);

      const req = { user: mockUser } as unknown as RequestWithUser;
      const result = await controller.getWaveMixArtistPlaylists(req, '0', '20');

      expect(waveMixService.getArtistPlaylistsPaginated).toHaveBeenCalledWith('user-1', 0, 20);
      expect(result.playlists).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getWaveMixGenrePlaylists', () => {
    it('should return paginated genre playlists', async () => {
      const mockResult = {
        playlists: [],
        total: 0,
        hasMore: false,
      };
      waveMixService.getGenrePlaylistsPaginated.mockResolvedValue(
        mockResult as ReturnType<WaveMixService['getGenrePlaylistsPaginated']> extends Promise<
          infer R
        >
          ? R
          : never
      );
      trackRepository.findByIds.mockResolvedValue([]);

      const req = { user: mockUser } as unknown as RequestWithUser;
      const result = await controller.getWaveMixGenrePlaylists(req, '0', '20');

      expect(waveMixService.getGenrePlaylistsPaginated).toHaveBeenCalledWith('user-1', 0, 20);
      expect(result.playlists).toEqual([]);
    });
  });
});
