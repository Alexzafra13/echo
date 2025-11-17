import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { WaveMixService } from './wave-mix.service';
import { ScoringService } from './scoring.service';
import { PLAY_TRACKING_REPOSITORY } from '@features/play-tracking/domain/ports';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { ExternalMetadataService } from '@features/external-metadata/application/external-metadata.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageDownloadService } from '@features/external-metadata/infrastructure/services/image-download.service';

describe('WaveMixService', () => {
  let service: WaveMixService;
  let mockLogger: any;
  let mockScoringService: any;
  let mockPlayTrackingRepo: any;
  let mockPrisma: any;
  let mockExternalMetadata: any;
  let mockRedis: any;
  let mockStorage: any;
  let mockImageDownload: any;

  beforeEach(async () => {
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

    mockPrisma = {
      track: {
        findMany: jest.fn(),
      },
      artist: {
        findUnique: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
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
          provide: PrismaService,
          useValue: mockPrisma,
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
      const mockTracks = [
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
      mockPrisma.track.findMany.mockResolvedValue(mockTracks);
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

    it('debería retornar un Wave Mix vacío cuando ningún track supera el score mínimo', async () => {
      // Arrange
      const userId = 'user-123';
      const mockTopTracks = [{ trackId: 'track-1', playCount: 5 }];
      const mockTracks = [
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
      mockPrisma.track.findMany.mockResolvedValue(mockTracks);
      mockScoringService.calculateAndRankTracks.mockResolvedValue(mockScoredTracks);

      // Act
      const result = await service.generateWaveMix(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.tracks).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId, minScore: 20 },
        'No tracks qualified, returning empty mix'
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

    it('debería generar playlists frescas si no hay cache', async () => {
      // Arrange
      const userId = 'user-123';
      mockRedis.get.mockResolvedValue(null);
      mockPlayTrackingRepo.getUserTopTracks.mockResolvedValue([]);
      mockPlayTrackingRepo.getUserTopArtists.mockResolvedValue([]);

      // Act
      const result = await service.getAllAutoPlaylists(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId },
        'Generating fresh playlists'
      );
    });
  });

  describe('refreshAutoPlaylists', () => {
    it('debería forzar la regeneración ignorando el cache', async () => {
      // Arrange
      const userId = 'user-123';
      mockPlayTrackingRepo.getUserTopTracks.mockResolvedValue([]);
      mockPlayTrackingRepo.getUserTopArtists.mockResolvedValue([]);

      // Act
      const result = await service.refreshAutoPlaylists(userId);

      // Assert
      expect(result).toBeDefined();
      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });
});
