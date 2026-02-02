import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { WaveMixService } from './wave-mix.service';
import { ScoringService } from '../../domain/services/scoring.service';
import { PLAY_TRACKING_REPOSITORY } from '@features/play-tracking/domain/ports';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { PlaylistShuffleService } from '../../domain/services/playlists';
import { PlaylistCoverService } from './playlists/playlist-cover.service';
import { ArtistPlaylistService } from './playlists/artist-playlist.service';
import { GenrePlaylistService } from './playlists/genre-playlist.service';

/**
 * WaveMixService Unit Tests
 *
 * These tests use DrizzleService mock with query builder pattern.
 * Tests cover Wave Mix generation, caching, and playlist generation.
 */
describe('WaveMixService', () => {
  let service: WaveMixService;
  let mockLogger: any;
  let mockScoringService: any;
  let mockPlayTrackingRepo: any;
  let mockDrizzle: any;
  let mockRedis: any;
  let mockShuffleService: any;
  let mockCoverService: any;
  let mockArtistPlaylistService: any;
  let mockGenrePlaylistService: any;

  // Mock data holders
  let mockTracksData: any[] = [];

  beforeEach(async () => {
    // Reset mock data
    mockTracksData = [];

    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockScoringService = {
      calculateAndRankTracks: jest.fn(),
    };

    mockPlayTrackingRepo = {
      getUserTopTracks: jest.fn(),
      getUserTopArtists: jest.fn(),
      getUserPlayStats: jest.fn(),
      getUserPlayHistory: jest.fn(),
    };

    // Create chainable mock for Drizzle query builder
    const createSelectMock = () => ({
      from: jest.fn().mockImplementation(() => ({
        where: jest.fn().mockImplementation(() => Promise.resolve(mockTracksData)),
        leftJoin: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => Promise.resolve([])),
      })),
    });

    mockDrizzle = {
      db: {
        select: jest.fn().mockImplementation(() => createSelectMock()),
        selectDistinct: jest.fn().mockImplementation(() => createSelectMock()),
      },
    };

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockShuffleService = {
      intelligentShuffle: jest.fn().mockImplementation((tracks) => Promise.resolve(tracks)),
      calculateMetadata: jest.fn().mockResolvedValue({
        totalTracks: 0,
        avgScore: 0,
        topGenres: [],
        topArtists: [],
        temporalDistribution: {
          lastWeek: 0,
          lastMonth: 0,
          lastYear: 0,
          older: 0,
        },
      }),
    };

    mockCoverService = {
      getRandomColor: jest.fn().mockReturnValue('#FF6B9D'),
      getGenreColor: jest.fn().mockReturnValue('#8B5CF6'),
      getArtistCoverImage: jest.fn().mockResolvedValue(undefined),
    };

    mockArtistPlaylistService = {
      generatePlaylists: jest.fn().mockResolvedValue([]),
      getPaginated: jest.fn().mockResolvedValue({ playlists: [], total: 0, hasMore: false }),
    };

    mockGenrePlaylistService = {
      generatePlaylists: jest.fn().mockResolvedValue([]),
      getPaginated: jest.fn().mockResolvedValue({ playlists: [], total: 0, hasMore: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaveMixService,
        {
          provide: `PinoLogger:${WaveMixService.name}`,
          useValue: mockLogger,
        },
        {
          provide: ScoringService,
          useValue: mockScoringService,
        },
        {
          provide: PLAY_TRACKING_REPOSITORY,
          useValue: mockPlayTrackingRepo,
        },
        {
          provide: DrizzleService,
          useValue: mockDrizzle,
        },
        {
          provide: RedisService,
          useValue: mockRedis,
        },
        {
          provide: PlaylistShuffleService,
          useValue: mockShuffleService,
        },
        {
          provide: PlaylistCoverService,
          useValue: mockCoverService,
        },
        {
          provide: ArtistPlaylistService,
          useValue: mockArtistPlaylistService,
        },
        {
          provide: GenrePlaylistService,
          useValue: mockGenrePlaylistService,
        },
      ],
    }).compile();

    service = module.get<WaveMixService>(WaveMixService);
  });

  describe('generateWaveMix', () => {
    it('debería retornar un Wave Mix vacío cuando el usuario no tiene historial', async () => {
      // Arrange
      const userId = 'user-123';
      mockPlayTrackingRepo.getUserTopTracks.mockResolvedValue([]);

      // Act
      const result = await service.generateWaveMix(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('wave-mix');
      expect(result.userId).toBe(userId);
      expect(result.tracks).toEqual([]);
      expect(result.name).toBe('Wave Mix');
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId },
        'No listening history, returning empty mix'
      );
    });

    it('debería generar un Wave Mix con tracks cuando el usuario tiene historial', async () => {
      // Arrange
      const userId = 'user-123';
      const mockTopTracks = [
        { trackId: 'track-1', playCount: 100 },
        { trackId: 'track-2', playCount: 80 },
      ];
      mockTracksData = [
        { id: 'track-1', artistId: 'artist-1', albumId: 'album-1', title: 'Track 1' },
        { id: 'track-2', artistId: 'artist-1', albumId: 'album-1', title: 'Track 2' },
      ];
      const mockScoredTracks = [
        {
          trackId: 'track-1',
          totalScore: 85,
          breakdown: { frequency: 80, recency: 90, diversity: 85 },
        },
        {
          trackId: 'track-2',
          totalScore: 75,
          breakdown: { frequency: 70, recency: 80, diversity: 75 },
        },
      ];
      const mockPlayHistory = [
        { trackId: 'track-1', playedAt: new Date() },
        { trackId: 'track-2', playedAt: new Date() },
      ];

      mockPlayTrackingRepo.getUserTopTracks.mockResolvedValue(mockTopTracks);
      mockScoringService.calculateAndRankTracks.mockResolvedValue(mockScoredTracks);
      mockPlayTrackingRepo.getUserPlayHistory.mockResolvedValue(mockPlayHistory);

      // Act
      const result = await service.generateWaveMix(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('wave-mix');
      expect(result.userId).toBe(userId);
      expect(result.tracks.length).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
      expect(result.coverColor).toBeDefined();
      expect(mockShuffleService.intelligentShuffle).toHaveBeenCalled();
      expect(mockShuffleService.calculateMetadata).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId, topTracksCount: mockTopTracks.length },
        'User top tracks retrieved'
      );
    });

    it('debería usar fallback cuando ningún track supera el score mínimo pero hay tracks disponibles', async () => {
      // Arrange
      const userId = 'user-123';
      const mockTopTracks = [{ trackId: 'track-1', playCount: 5 }];
      mockTracksData = [
        { id: 'track-1', artistId: 'artist-1', albumId: 'album-1', title: 'Track 1' },
      ];
      const mockScoredTracks = [
        {
          trackId: 'track-1',
          totalScore: 5, // Below default minScore of 10
          breakdown: { frequency: 5, recency: 5, diversity: 5 },
        },
      ];

      mockPlayTrackingRepo.getUserTopTracks.mockResolvedValue(mockTopTracks);
      mockPlayTrackingRepo.getUserPlayHistory.mockResolvedValue([]);
      mockScoringService.calculateAndRankTracks.mockResolvedValue(mockScoredTracks);

      // Act
      const result = await service.generateWaveMix(userId);

      // Assert
      expect(result).toBeDefined();
      // El servicio usa lógica de fallback, así que debería incluir el track de todas formas
      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].trackId).toBe('track-1');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          tracksUsed: 1,
        }),
        'Using all available tracks'
      );
    });
  });

  describe('getAllAutoPlaylists', () => {
    it('debería retornar playlists cacheadas de Redis si existen', async () => {
      // Arrange
      const userId = 'user-123';
      const cachedPlaylists = [
        {
          id: 'wave-mix-123',
          type: 'wave-mix',
          userId,
          name: 'Wave Mix',
          description: 'Test',
          tracks: [],
          createdAt: new Date(),
          expiresAt: new Date(),
          metadata: {
            totalTracks: 0,
            avgScore: 0,
            topGenres: [],
            topArtists: [],
            temporalDistribution: {
              lastWeek: 0,
              lastMonth: 0,
              lastYear: 0,
              older: 0,
            },
          },
          coverColor: '#FF6B9D',
        },
      ];

      mockRedis.get.mockResolvedValue(cachedPlaylists);

      // Act
      const result = await service.getAllAutoPlaylists(userId);

      // Assert
      expect(result).toEqual(cachedPlaylists);
      expect(mockRedis.get).toHaveBeenCalledWith(`auto-playlists:${userId}`);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId },
        'Serving cached playlists from Redis'
      );
    });

    it('debería generar playlists frescas si no hay cache pero no cachear si están vacías', async () => {
      // Arrange
      const userId = 'user-123';
      mockRedis.get.mockResolvedValue(null);
      mockPlayTrackingRepo.getUserTopTracks.mockResolvedValue([]);
      mockArtistPlaylistService.generatePlaylists.mockResolvedValue([]);
      mockGenrePlaylistService.generatePlaylists.mockResolvedValue([]);

      // Act
      const result = await service.getAllAutoPlaylists(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      // No debería cachear playlists vacías (usuario sin historial)
      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId },
        'Generating fresh playlists'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId },
        'Skipping cache - playlists are empty'
      );
    });
  });

  describe('refreshAutoPlaylists', () => {
    it('debería forzar la regeneración ignorando el cache', async () => {
      // Arrange
      const userId = 'user-123';
      mockPlayTrackingRepo.getUserTopTracks.mockResolvedValue([]);
      mockArtistPlaylistService.generatePlaylists.mockResolvedValue([]);
      mockGenrePlaylistService.generatePlaylists.mockResolvedValue([]);

      // Act
      const result = await service.refreshAutoPlaylists(userId);

      // Assert
      expect(result).toBeDefined();
      expect(mockRedis.get).not.toHaveBeenCalled();
      // No debería cachear playlists vacías (usuario sin historial)
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });

  describe('generateArtistPlaylists', () => {
    it('debería delegar a ArtistPlaylistService', async () => {
      // Arrange
      const userId = 'user-123';
      const mockPlaylists = [{ id: 'artist-mix-1', type: 'artist' }];
      mockArtistPlaylistService.generatePlaylists.mockResolvedValue(mockPlaylists);

      // Act
      const result = await service.generateArtistPlaylists(userId, 5);

      // Assert
      expect(result).toEqual(mockPlaylists);
      expect(mockArtistPlaylistService.generatePlaylists).toHaveBeenCalledWith(userId, 5);
    });
  });

  describe('generateGenrePlaylists', () => {
    it('debería delegar a GenrePlaylistService', async () => {
      // Arrange
      const userId = 'user-123';
      const mockPlaylists = [{ id: 'genre-mix-1', type: 'genre' }];
      mockGenrePlaylistService.generatePlaylists.mockResolvedValue(mockPlaylists);

      // Act
      const result = await service.generateGenrePlaylists(userId, 5);

      // Assert
      expect(result).toEqual(mockPlaylists);
      expect(mockGenrePlaylistService.generatePlaylists).toHaveBeenCalledWith(userId, 5);
    });
  });

  describe('getArtistPlaylistsPaginated', () => {
    it('debería delegar a ArtistPlaylistService.getPaginated', async () => {
      // Arrange
      const userId = 'user-123';
      const mockResult = { playlists: [], total: 10, hasMore: true };
      mockArtistPlaylistService.getPaginated.mockResolvedValue(mockResult);

      // Act
      const result = await service.getArtistPlaylistsPaginated(userId, 0, 5);

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockArtistPlaylistService.getPaginated).toHaveBeenCalledWith(userId, 0, 5);
    });
  });

  describe('getGenrePlaylistsPaginated', () => {
    it('debería delegar a GenrePlaylistService.getPaginated', async () => {
      // Arrange
      const userId = 'user-123';
      const mockResult = { playlists: [], total: 8, hasMore: false };
      mockGenrePlaylistService.getPaginated.mockResolvedValue(mockResult);

      // Act
      const result = await service.getGenrePlaylistsPaginated(userId, 5, 5);

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockGenrePlaylistService.getPaginated).toHaveBeenCalledWith(userId, 5, 5);
    });
  });
});
