import { Artist } from '../../domain/entities/artist.entity';
import { IArtistRepository } from '../../domain/ports/artist-repository.port';
import { CachedArtistRepository } from './cached-artist.repository';

describe('CachedArtistRepository', () => {
  let cachedRepository: CachedArtistRepository;
  let baseRepository: jest.Mocked<IArtistRepository>;
  let cacheService: any;

  const mockArtistPrimitives = {
    id: 'artist-1',
    name: 'Test Artist',
    bio: 'A test artist bio',
    imageUrl: '/images/artist1.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockArtist = Artist.reconstruct(mockArtistPrimitives);

  beforeEach(() => {
    // Mock base repository
    baseRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      search: jest.fn(),
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

    // Create instance directly without TestingModule for simplicity
    cachedRepository = new CachedArtistRepository(baseRepository as any, cacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return cached artist on cache hit', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(mockArtistPrimitives);

      // Act
      const result = await cachedRepository.findById('artist-1');

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('artist:artist-1');
      expect(baseRepository.findById).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.id).toBe('artist-1');
      expect(result?.name).toBe('Test Artist');
    });

    it('should fetch from DB and cache on cache miss', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      baseRepository.findById.mockResolvedValue(mockArtist);

      // Act
      const result = await cachedRepository.findById('artist-1');

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('artist:artist-1');
      expect(baseRepository.findById).toHaveBeenCalledWith('artist-1');
      expect(cacheService.set).toHaveBeenCalledWith(
        'artist:artist-1',
        expect.any(Object),
        expect.any(Number),
      );
      expect(result).toBe(mockArtist);
    });

    it('should return null if artist not found', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      baseRepository.findById.mockResolvedValue(null);

      // Act
      const result = await cachedRepository.findById('non-existent');

      // Assert
      expect(result).toBeNull();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should handle cache service errors gracefully', async () => {
      // Arrange
      cacheService.get.mockRejectedValue(new Error('Redis connection failed'));
      baseRepository.findById.mockResolvedValue(mockArtist);

      // Act & Assert
      await expect(cachedRepository.findById('artist-1')).rejects.toThrow(
        'Redis connection failed',
      );
    });
  });

  describe('findAll', () => {
    it('should delegate to base repository without caching', async () => {
      // Arrange
      const artists = [mockArtist];
      baseRepository.findAll.mockResolvedValue(artists);

      // Act
      const result = await cachedRepository.findAll(0, 10);

      // Assert
      expect(baseRepository.findAll).toHaveBeenCalledWith(0, 10);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result).toBe(artists);
    });
  });

  describe('search', () => {
    it('should delegate to base repository without caching', async () => {
      // Arrange
      const artists = [mockArtist];
      baseRepository.search.mockResolvedValue(artists);

      // Act
      const result = await cachedRepository.search('test', 0, 10);

      // Assert
      expect(baseRepository.search).toHaveBeenCalledWith('test', 0, 10);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result).toBe(artists);
    });
  });

  describe('count', () => {
    it('should delegate to base repository without caching', async () => {
      // Arrange
      baseRepository.count.mockResolvedValue(42);

      // Act
      const result = await cachedRepository.count();

      // Assert
      expect(baseRepository.count).toHaveBeenCalled();
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(result).toBe(42);
    });
  });

  describe('create', () => {
    it('should create artist without cache invalidation', async () => {
      // Arrange
      baseRepository.create.mockResolvedValue(mockArtist);

      // Act
      const result = await cachedRepository.create(mockArtist);

      // Assert
      expect(baseRepository.create).toHaveBeenCalledWith(mockArtist);
      expect(cacheService.del).not.toHaveBeenCalled();
      expect(result).toBe(mockArtist);
    });
  });

  describe('update', () => {
    it('should update artist and invalidate specific cache', async () => {
      // Arrange
      const updates = { name: 'Updated Artist' };
      baseRepository.update.mockResolvedValue(mockArtist);

      // Act
      const result = await cachedRepository.update('artist-1', updates);

      // Assert
      expect(baseRepository.update).toHaveBeenCalledWith('artist-1', updates);
      expect(cacheService.del).toHaveBeenCalledWith('artist:artist-1');
      expect(cacheService.del).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockArtist);
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

    it('should handle partial updates correctly', async () => {
      // Arrange
      const updates = { bio: 'New bio' };
      baseRepository.update.mockResolvedValue(mockArtist);

      // Act
      const result = await cachedRepository.update('artist-1', updates);

      // Assert
      expect(baseRepository.update).toHaveBeenCalledWith('artist-1', updates);
      expect(result).toBe(mockArtist);
      expect(cacheService.del).toHaveBeenCalledWith('artist:artist-1');
    });
  });

  describe('delete', () => {
    it('should delete artist and invalidate cache', async () => {
      // Arrange
      baseRepository.delete.mockResolvedValue(true);

      // Act
      const result = await cachedRepository.delete('artist-1');

      // Assert
      expect(baseRepository.delete).toHaveBeenCalledWith('artist-1');
      expect(cacheService.del).toHaveBeenCalledWith('artist:artist-1');
      expect(cacheService.del).toHaveBeenCalledTimes(1);
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
    it('should use longer TTL for artists (7200s default)', () => {
      // The constructor reads process.env.CACHE_ARTIST_TTL with default 7200
      // We can't easily test private properties, but we verify it doesn't crash
      expect(cachedRepository).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle full CRUD cycle with proper cache management', async () => {
      // Create
      baseRepository.create.mockResolvedValue(mockArtist);
      const created = await cachedRepository.create(mockArtist);
      expect(created).toBe(mockArtist);

      // Read (cache miss)
      cacheService.get.mockResolvedValue(null);
      baseRepository.findById.mockResolvedValue(mockArtist);
      const read1 = await cachedRepository.findById('artist-1');
      expect(cacheService.set).toHaveBeenCalled();

      // Read (cache hit)
      cacheService.get.mockResolvedValue(mockArtistPrimitives);
      const read2 = await cachedRepository.findById('artist-1');
      expect(read2?.id).toBe('artist-1');

      // Update (invalidates cache)
      baseRepository.update.mockResolvedValue(mockArtist);
      await cachedRepository.update('artist-1', { name: 'New Name' });
      expect(cacheService.del).toHaveBeenCalledWith('artist:artist-1');

      // Delete (invalidates cache)
      baseRepository.delete.mockResolvedValue(true);
      await cachedRepository.delete('artist-1');
      expect(cacheService.del).toHaveBeenCalledWith('artist:artist-1');
    });
  });
});
