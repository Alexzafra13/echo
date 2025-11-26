import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { WaveMixService } from './wave-mix.service';
import { ScoringService } from './scoring.service';
import { PLAY_TRACKING_REPOSITORY } from '@features/play-tracking/domain/ports';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { ExternalMetadataService } from '@features/external-metadata/application/external-metadata.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageDownloadService } from '@features/external-metadata/infrastructure/services/image-download.service';

/**
 * TODO: Update tests after Prisma to Drizzle migration
 *
 * These tests use DrizzleService mock with query builder pattern.
 * Some tests may need adjustment based on actual Drizzle query patterns.
 */
describe('WaveMixService', () => {
  let service: WaveMixService;
  let mockLogger: any;
  let mockScoringService: any;
  let mockPlayTrackingRepo: any;
  let mockDrizzle: any;
  let mockExternalMetadata: any;
  let mockRedis: any;
  let mockStorage: any;
  let mockImageDownload: any;

  // Mock data holders
  let mockTracksData: any[] = [];
  let mockArtistData: any = null;

  beforeEach(async () => {
    // Reset mock data
    mockTracksData = [];
    mockArtistData = null;

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
        limit: jest.fn().mockImplementation(() =>
          mockArtistData ? Promise.resolve([mockArtistData]) : Promise.resolve([])
        ),
      })),
    });

    mockDrizzle = {
      db: {
        select: jest.fn().mockImplementation(() => createSelectMock()),
        selectDistinct: jest.fn().mockImplementation(() => createSelectMock()),
      },
    };

    mockExternalMetadata = {
      getArtistImages: jest.fn(),
    };

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockStorage = {
      exists: jest.fn(),
    };

    mockImageDownload = {
      downloadAndSaveImage: jest.fn(),
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
          provide: ExternalMetadataService,
          useValue: mockExternalMetadata,
        },
        {
          provide: RedisService,
          useValue: mockRedis,
        },
        {
          provide: StorageService,
          useValue: mockStorage,
        },
        {
          provide: ImageDownloadService,
          useValue: mockImageDownload,
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
          totalScore: 15, // Below default minScore of 20
          breakdown: { frequency: 10, recency: 20, diversity: 15 },
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
          userId,
          tracksUsed: 1,
        }),
        'Using all available tracks regardless of score'
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
      mockPlayTrackingRepo.getUserTopArtists.mockResolvedValue([]);
      mockPlayTrackingRepo.getUserPlayStats.mockResolvedValue([]);

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
        'Skipping cache - playlists are empty (user building listening history)'
      );
    });
  });

  describe('refreshAutoPlaylists', () => {
    it('debería forzar la regeneración ignorando el cache', async () => {
      // Arrange
      const userId = 'user-123';
      mockPlayTrackingRepo.getUserTopTracks.mockResolvedValue([]);
      mockPlayTrackingRepo.getUserTopArtists.mockResolvedValue([]);
      mockPlayTrackingRepo.getUserPlayStats.mockResolvedValue([]);

      // Act
      const result = await service.refreshAutoPlaylists(userId);

      // Assert
      expect(result).toBeDefined();
      expect(mockRedis.get).not.toHaveBeenCalled();
      // No debería cachear playlists vacías (usuario sin historial)
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });
});
