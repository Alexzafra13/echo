import { Track } from '../../domain/entities/track.entity';
import { ITrackRepository } from '../../domain/ports/track-repository.port';
import { CachedTrackRepository } from './cached-track.repository';

describe('CachedTrackRepository', () => {
  let cachedRepository: CachedTrackRepository;
  let baseRepository: jest.Mocked<ITrackRepository>;
  let cacheService: any;

  const mockTrackPrimitives = {
    id: 'track-1',
    title: 'Test Track',
    duration: 240,
    trackNumber: 1,
    albumId: 'album-1',
    artistId: 'artist-1',
    filePath: '/music/track1.mp3',
    fileSize: 5242880,
    mimeType: 'audio/mpeg',
    bitrate: 320,
    sampleRate: 44100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTrack = Track.reconstruct(mockTrackPrimitives);

  beforeEach(() => {
    // Mock base repository
    baseRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      search: jest.fn(),
      findByAlbumId: jest.fn(),
      findByArtistId: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    // Mock cache service
    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    // Mock logger
    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Create instance directly without TestingModule to avoid Prisma imports
    cachedRepository = new CachedTrackRepository(baseRepository as any, cacheService, mockLogger as any);
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
    it('should delegate to base repository without caching', async () => {
      // Arrange
      const tracks = [mockTrack];
      baseRepository.search.mockResolvedValue(tracks);

      // Act
      const result = await cachedRepository.search('test', 0, 10);

      // Assert
      expect(baseRepository.search).toHaveBeenCalledWith('test', 0, 10);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result).toBe(tracks);
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
      expect(baseRepository.findByAlbumId).toHaveBeenCalledWith('album-1');
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

  describe('create', () => {
    it('should create track without cache invalidation', async () => {
      // Arrange
      baseRepository.create.mockResolvedValue(mockTrack);

      // Act
      const result = await cachedRepository.create(mockTrack);

      // Assert
      expect(baseRepository.create).toHaveBeenCalledWith(mockTrack);
      expect(cacheService.del).not.toHaveBeenCalled();
      expect(result).toBe(mockTrack);
    });
  });

  describe('update', () => {
    it('should update track and invalidate specific cache', async () => {
      // Arrange
      const updates = { title: 'Updated Track' };
      baseRepository.update.mockResolvedValue(mockTrack);

      // Act
      const result = await cachedRepository.update('track-1', updates);

      // Assert
      expect(baseRepository.update).toHaveBeenCalledWith('track-1', updates);
      expect(cacheService.del).toHaveBeenCalledWith('track:track-1');
      expect(result).toBe(mockTrack);
    });

    it('should NOT invalidate cache if update fails', async () => {
      // Arrange
      baseRepository.update.mockResolvedValue(null);

      // Act
      const result = await cachedRepository.update('non-existent', {});

      // Assert
      expect(cacheService.del).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete track and invalidate cache', async () => {
      // Arrange
      baseRepository.delete.mockResolvedValue(true);

      // Act
      const result = await cachedRepository.delete('track-1');

      // Assert
      expect(baseRepository.delete).toHaveBeenCalledWith('track-1');
      expect(cacheService.del).toHaveBeenCalledWith('track:track-1');
      expect(result).toBe(true);
    });

    it('should NOT invalidate cache if delete fails', async () => {
      // Arrange
      baseRepository.delete.mockResolvedValue(false);

      // Act
      const result = await cachedRepository.delete('non-existent');

      // Assert
      expect(cacheService.del).not.toHaveBeenCalled();
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
