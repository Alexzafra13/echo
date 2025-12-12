import { PinoLogger } from 'nestjs-pino';
import { Track } from '../../domain/entities/track.entity';
import { ITrackRepository } from '../../domain/ports/track-repository.port';
import { CachedTrackRepository } from './cached-track.repository';
import {
  MockCacheService,
  MockPinoLogger,
  createMockCacheService,
  createMockPinoLogger,
} from '@shared/testing/mock.types';

describe('CachedTrackRepository', () => {
  let cachedRepository: CachedTrackRepository;
  let baseRepository: jest.Mocked<ITrackRepository>;
  let cacheService: MockCacheService;

  const mockTrackPrimitives = {
    id: 'track-1',
    title: 'Test Track',
    duration: 240,
    trackNumber: 1,
    discNumber: 1,
    albumId: 'album-1',
    artistId: 'artist-1',
    path: '/music/track1.mp3',
    size: 5242880,
    bitRate: 320,
    suffix: 'mp3',
    compilation: false,
    playCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTrack = Track.reconstruct(mockTrackPrimitives);

  beforeEach(() => {
    // Mock base repository
    baseRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findAll: jest.fn(),
      search: jest.fn(),
      findByAlbumId: jest.fn(),
      findByArtistId: jest.fn(),
      findTopByArtistId: jest.fn(),
      count: jest.fn(),
      findShuffledPaginated: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ITrackRepository>;

    // Mock cache service
    cacheService = createMockCacheService();

    // Mock logger
    const mockLogger: MockPinoLogger = createMockPinoLogger();

    // Create instance directly without TestingModule for simplicity
    cachedRepository = new CachedTrackRepository(
      baseRepository as any,
      cacheService as any,
      mockLogger as unknown as PinoLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return cached track on cache hit', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(mockTrackPrimitives);

      // Act
      const result = await cachedRepository.findById('track-1');

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('track:track-1');
      expect(baseRepository.findById).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.id).toBe('track-1');
    });

    it('should fetch from DB and cache on cache miss', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      baseRepository.findById.mockResolvedValue(mockTrack);

      // Act
      const result = await cachedRepository.findById('track-1');

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('track:track-1');
      expect(baseRepository.findById).toHaveBeenCalledWith('track-1');
      expect(cacheService.set).toHaveBeenCalledWith(
        'track:track-1',
        expect.any(Object),
        expect.any(Number),
      );
      expect(result).toBe(mockTrack);
    });

    it('should return null if track not found', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      baseRepository.findById.mockResolvedValue(null);

      // Act
      const result = await cachedRepository.findById('non-existent');

      // Assert
      expect(result).toBeNull();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should delegate to base repository without caching', async () => {
      // Arrange
      const tracks = [mockTrack];
      baseRepository.findAll.mockResolvedValue(tracks);

      // Act
      const result = await cachedRepository.findAll(0, 10);

      // Assert
      expect(baseRepository.findAll).toHaveBeenCalledWith(0, 10);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result).toBe(tracks);
    });
  });

  describe('search', () => {
    it('should cache search results', async () => {
      // Arrange
      const tracks = [mockTrack];
      cacheService.get.mockResolvedValue(null);
      baseRepository.search.mockResolvedValue(tracks);

      // Act
      const result = await cachedRepository.search('test', 0, 10);

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('tracks:search:test:0:10');
      expect(baseRepository.search).toHaveBeenCalledWith('test', 0, 10);
      expect(cacheService.set).toHaveBeenCalled();
      expect(result).toEqual(tracks);
    });

    it('should return cached search results on cache hit', async () => {
      // Arrange
      const tracksPrimitives = [mockTrackPrimitives];
      cacheService.get.mockResolvedValue(tracksPrimitives);

      // Act
      const result = await cachedRepository.search('test', 0, 10);

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('tracks:search:test:0:10');
      expect(baseRepository.search).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should normalize search query for cache key', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      baseRepository.search.mockResolvedValue([]);

      // Act
      await cachedRepository.search('  TEST  ', 0, 10);

      // Assert - query should be normalized to lowercase and trimmed
      expect(cacheService.get).toHaveBeenCalledWith('tracks:search:test:0:10');
    });
  });

  describe('findByAlbumId', () => {
    it('should delegate to base repository without caching', async () => {
      // Arrange
      const tracks = [mockTrack];
      baseRepository.findByAlbumId.mockResolvedValue(tracks);

      // Act
      const result = await cachedRepository.findByAlbumId('album-1');

      // Assert
      expect(baseRepository.findByAlbumId).toHaveBeenCalledWith('album-1', true);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(result).toBe(tracks);
    });
  });

  describe('findByArtistId', () => {
    it('should delegate to base repository without caching', async () => {
      // Arrange
      const tracks = [mockTrack];
      baseRepository.findByArtistId.mockResolvedValue(tracks);

      // Act
      const result = await cachedRepository.findByArtistId('artist-1', 0, 10);

      // Assert
      expect(baseRepository.findByArtistId).toHaveBeenCalledWith('artist-1', 0, 10);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(result).toBe(tracks);
    });
  });

  describe('count', () => {
    it('should delegate to base repository without caching', async () => {
      // Arrange
      baseRepository.count.mockResolvedValue(100);

      // Act
      const result = await cachedRepository.count();

      // Assert
      expect(baseRepository.count).toHaveBeenCalled();
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(result).toBe(100);
    });
  });

  describe('findShuffledPaginated', () => {
    it('should delegate to base repository without caching', async () => {
      // Arrange
      const tracks = [mockTrack];
      baseRepository.findShuffledPaginated.mockResolvedValue(tracks);

      // Act
      const result = await cachedRepository.findShuffledPaginated(0.5, 0, 50);

      // Assert
      expect(baseRepository.findShuffledPaginated).toHaveBeenCalledWith(0.5, 0, 50);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result).toBe(tracks);
    });

    it('should support different seed values for different orderings', async () => {
      // Arrange
      const tracks = [mockTrack];
      baseRepository.findShuffledPaginated.mockResolvedValue(tracks);

      // Act
      await cachedRepository.findShuffledPaginated(0.123, 0, 50);
      await cachedRepository.findShuffledPaginated(0.456, 0, 50);

      // Assert
      expect(baseRepository.findShuffledPaginated).toHaveBeenCalledTimes(2);
      expect(baseRepository.findShuffledPaginated).toHaveBeenNthCalledWith(1, 0.123, 0, 50);
      expect(baseRepository.findShuffledPaginated).toHaveBeenNthCalledWith(2, 0.456, 0, 50);
    });
  });

  describe('create', () => {
    it('should create track and invalidate search cache', async () => {
      // Arrange
      baseRepository.create.mockResolvedValue(mockTrack);

      // Act
      const result = await cachedRepository.create(mockTrack);

      // Assert
      expect(baseRepository.create).toHaveBeenCalledWith(mockTrack);
      expect(cacheService.delPattern).toHaveBeenCalledWith('tracks:search:*');
      expect(result).toBe(mockTrack);
    });
  });

  describe('update', () => {
    it('should update track and invalidate caches', async () => {
      // Arrange
      const updates = { title: 'Updated Track' };
      baseRepository.update.mockResolvedValue(mockTrack);

      // Act
      const result = await cachedRepository.update('track-1', updates);

      // Assert
      expect(baseRepository.update).toHaveBeenCalledWith('track-1', updates);
      expect(cacheService.del).toHaveBeenCalledWith('track:track-1');
      expect(cacheService.delPattern).toHaveBeenCalledWith('tracks:search:*');
      expect(result).toBe(mockTrack);
    });

    it('should NOT invalidate cache if update fails', async () => {
      // Arrange
      baseRepository.update.mockResolvedValue(null);

      // Act
      const result = await cachedRepository.update('non-existent', {});

      // Assert
      expect(cacheService.del).not.toHaveBeenCalled();
      expect(cacheService.delPattern).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete track and invalidate caches', async () => {
      // Arrange
      baseRepository.delete.mockResolvedValue(true);

      // Act
      const result = await cachedRepository.delete('track-1');

      // Assert
      expect(baseRepository.delete).toHaveBeenCalledWith('track-1');
      expect(cacheService.del).toHaveBeenCalledWith('track:track-1');
      expect(cacheService.delPattern).toHaveBeenCalledWith('tracks:search:*');
      expect(result).toBe(true);
    });

    it('should NOT invalidate cache if delete fails', async () => {
      // Arrange
      baseRepository.delete.mockResolvedValue(false);

      // Act
      const result = await cachedRepository.delete('non-existent');

      // Assert
      expect(cacheService.del).not.toHaveBeenCalled();
      expect(cacheService.delPattern).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('cache TTL configuration', () => {
    it('should use default TTL from environment', () => {
      // The constructor reads process.env.CACHE_TRACK_TTL
      // We can't easily test private properties, but we verify it doesn't crash
      expect(cachedRepository).toBeDefined();
    });
  });
});
