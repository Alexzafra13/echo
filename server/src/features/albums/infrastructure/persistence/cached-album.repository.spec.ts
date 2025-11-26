import { Album } from '../../domain/entities/album.entity';
import { IAlbumRepository } from '../../domain/ports/album-repository.port';
import { CachedAlbumRepository } from './cached-album.repository';

describe('CachedAlbumRepository', () => {
  let cachedRepository: CachedAlbumRepository;
  let baseRepository: jest.Mocked<IAlbumRepository>;
  let cacheService: any;

  const mockAlbumPrimitives = {
    id: 'album-1',
    title: 'Test Album',
    artistId: 'artist-1',
    releaseDate: new Date('2024-01-01'),
    coverPath: '/covers/album1.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAlbum = Album.reconstruct(mockAlbumPrimitives);

  beforeEach(() => {
    // Mock base repository
    baseRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      search: jest.fn(),
      findByArtistId: jest.fn(),
      findRecent: jest.fn(),
      findMostPlayed: jest.fn(),
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
      delPattern: jest.fn(), // For wildcard key deletion
    };

    // Mock PinoLogger
    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    // Create instance directly without TestingModule to avoid Prisma imports
    // Constructor expects: (logger, baseRepository, cache)
    cachedRepository = new CachedAlbumRepository(mockLogger, baseRepository as any, cacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return cached album on cache hit', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(mockAlbumPrimitives);

      // Act
      const result = await cachedRepository.findById('album-1');

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('album:album-1');
      expect(baseRepository.findById).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.id).toBe('album-1');
    });

    it('should fetch from DB and cache on cache miss', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      baseRepository.findById.mockResolvedValue(mockAlbum);

      // Act
      const result = await cachedRepository.findById('album-1');

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('album:album-1');
      expect(baseRepository.findById).toHaveBeenCalledWith('album-1');
      expect(cacheService.set).toHaveBeenCalledWith(
        'album:album-1',
        expect.any(Object),
        expect.any(Number),
      );
      expect(result).toBe(mockAlbum);
    });

    it('should return null if album not found', async () => {
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
    it('should NOT cache paginated list', async () => {
      // Arrange
      const albums = [mockAlbum];
      baseRepository.findAll.mockResolvedValue(albums);

      // Act
      const result = await cachedRepository.findAll(0, 10);

      // Assert
      expect(baseRepository.findAll).toHaveBeenCalledWith(0, 10);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result).toBe(albums);
    });
  });

  describe('search', () => {
    it('should NOT cache search results', async () => {
      // Arrange
      const albums = [mockAlbum];
      baseRepository.search.mockResolvedValue(albums);

      // Act
      const result = await cachedRepository.search('test', 0, 10);

      // Assert
      expect(baseRepository.search).toHaveBeenCalledWith('test', 0, 10);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result).toBe(albums);
    });
  });

  describe('findByArtistId', () => {
    it('should return cached albums on cache hit', async () => {
      // Arrange
      const albumsPrimitives = [mockAlbumPrimitives];
      cacheService.get.mockResolvedValue(albumsPrimitives);

      // Act
      const result = await cachedRepository.findByArtistId('artist-1', 0, 10);

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('albums:artist:artist-1:0:10');
      expect(baseRepository.findByArtistId).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('album-1');
    });

    it('should fetch from DB and cache on cache miss', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      baseRepository.findByArtistId.mockResolvedValue([mockAlbum]);

      // Act
      const result = await cachedRepository.findByArtistId('artist-1', 0, 10);

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('albums:artist:artist-1:0:10');
      expect(baseRepository.findByArtistId).toHaveBeenCalledWith('artist-1', 0, 10);
      expect(cacheService.set).toHaveBeenCalledWith(
        'albums:artist:artist-1:0:10',
        expect.any(Array),
        expect.any(Number),
      );
      expect(result).toHaveLength(1);
    });

    it('should NOT cache empty results', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      baseRepository.findByArtistId.mockResolvedValue([]);

      // Act
      const result = await cachedRepository.findByArtistId('artist-2', 0, 10);

      // Assert
      expect(baseRepository.findByArtistId).toHaveBeenCalledWith('artist-2', 0, 10);
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });
  });

  describe('findRecent', () => {
    it('should cache recent albums with shorter TTL', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      baseRepository.findRecent.mockResolvedValue([mockAlbum]);

      // Act
      const result = await cachedRepository.findRecent(10);

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('albums:recent:10');
      expect(baseRepository.findRecent).toHaveBeenCalledWith(10);
      expect(cacheService.set).toHaveBeenCalledWith(
        'albums:recent:10',
        expect.any(Array),
        300, // 5 minutes TTL
      );
      expect(result).toHaveLength(1);
    });

    it('should return cached recent albums on cache hit', async () => {
      // Arrange
      cacheService.get.mockResolvedValue([mockAlbumPrimitives]);

      // Act
      const result = await cachedRepository.findRecent(10);

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('albums:recent:10');
      expect(baseRepository.findRecent).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('findMostPlayed', () => {
    it('should cache most played albums', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      baseRepository.findMostPlayed.mockResolvedValue([mockAlbum]);

      // Act
      const result = await cachedRepository.findMostPlayed(10);

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('albums:most-played:10');
      expect(baseRepository.findMostPlayed).toHaveBeenCalledWith(10);
      expect(cacheService.set).toHaveBeenCalledWith(
        'albums:most-played:10',
        expect.any(Array),
        600, // 10 minutes TTL
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('count', () => {
    it('should cache count with long TTL', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      baseRepository.count.mockResolvedValue(42);

      // Act
      const result = await cachedRepository.count();

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('albums:count');
      expect(baseRepository.count).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith('albums:count', 42, 1800); // 30 minutes
      expect(result).toBe(42);
    });

    it('should return cached count on cache hit', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(100);

      // Act
      const result = await cachedRepository.count();

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('albums:count');
      expect(baseRepository.count).not.toHaveBeenCalled();
      expect(result).toBe(100);
    });
  });

  describe('create', () => {
    it('should create album and invalidate list caches', async () => {
      // Arrange
      baseRepository.create.mockResolvedValue(mockAlbum);

      // Act
      const result = await cachedRepository.create(mockAlbum);

      // Assert
      expect(baseRepository.create).toHaveBeenCalledWith(mockAlbum);
      // invalidateListCaches now uses: 4x delPattern() (album:*, recent:*, most-played:*, artist:*) + 2x del()
      expect(cacheService.delPattern).toHaveBeenCalledTimes(4);
      expect(cacheService.del).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockAlbum);
    });
  });

  describe('update', () => {
    it('should update album and invalidate caches', async () => {
      // Arrange
      const updates = { title: 'Updated Title' };
      baseRepository.update.mockResolvedValue(mockAlbum);

      // Act
      const result = await cachedRepository.update('album-1', updates);

      // Assert
      expect(baseRepository.update).toHaveBeenCalledWith('album-1', updates);
      expect(cacheService.del).toHaveBeenCalledWith('album:album-1');
      // 1 specific del() + invalidateListCaches (4x delPattern + 2x del)
      expect(cacheService.del).toHaveBeenCalledTimes(3);
      expect(cacheService.delPattern).toHaveBeenCalledTimes(4);
      expect(result).toBe(mockAlbum);
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
    it('should delete album and invalidate caches', async () => {
      // Arrange
      baseRepository.delete.mockResolvedValue(true);

      // Act
      const result = await cachedRepository.delete('album-1');

      // Assert
      expect(baseRepository.delete).toHaveBeenCalledWith('album-1');
      expect(cacheService.del).toHaveBeenCalledWith('album:album-1');
      // 1 specific del() + invalidateListCaches (4x delPattern + 2x del)
      expect(cacheService.del).toHaveBeenCalledTimes(3);
      expect(cacheService.delPattern).toHaveBeenCalledTimes(4);
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
});
