import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { getLoggerToken } from 'nestjs-pino';
import { RedisService } from '../../src/infrastructure/cache/redis.service';
import { CachedAlbumRepository } from '../../src/features/albums/infrastructure/persistence/cached-album.repository';
import { DrizzleAlbumRepository } from '../../src/features/albums/infrastructure/persistence/album.repository';
import { Album, AlbumProps } from '../../src/features/albums/domain/entities/album.entity';
import { IAlbumRepository } from '../../src/features/albums/domain/ports/album-repository.port';

// Mock logger para tests de integración
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  setContext: jest.fn(),
  assign: jest.fn(),
};

/**
 * CachedAlbumRepository Integration Tests
 *
 * Tests de integración que verifican el comportamiento del CachedAlbumRepository
 * con una instancia REAL de Redis (no mocks).
 *
 * Requieren: Redis corriendo (docker-compose.dev.yml)
 * Ejecutar: pnpm test:integration cached-album-repository.integration-spec
 */
describe('CachedAlbumRepository Integration', () => {
  let redisService: RedisService;
  let cachedRepository: CachedAlbumRepository;
  let baseRepository: jest.Mocked<IAlbumRepository>;
  let module: TestingModule;

  // Mock album data usando los campos correctos según AlbumProps
  const mockAlbumData: AlbumProps = {
    id: 'album-test-1',
    name: 'Integration Test Album',
    artistId: 'artist-1',
    artistName: 'Test Artist',
    albumArtistId: undefined,
    coverArtPath: '/covers/test.jpg',
    year: 2024,
    releaseDate: new Date('2024-01-15'),
    compilation: false,
    songCount: 10,
    duration: 2400,
    size: 100000000,
    description: 'Test album for integration tests',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAlbum = Album.reconstruct(mockAlbumData);

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        RedisService,
        {
          provide: getLoggerToken(RedisService.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    redisService = module.get<RedisService>(RedisService);
    await redisService.onModuleInit();

    // Limpiar Redis antes de empezar
    await redisService.clear();
  });

  beforeEach(() => {
    // Mock del base repository
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
    } as unknown as jest.Mocked<IAlbumRepository>;

    // Crear instancia del cached repository con Redis REAL
    cachedRepository = new CachedAlbumRepository(
      baseRepository as unknown as DrizzleAlbumRepository,
      redisService,
      mockLogger as unknown as PinoLogger,
    );
  });

  afterEach(async () => {
    // Limpiar Redis después de cada test
    await redisService.clear();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (redisService) {
      await redisService.clear();
    }
    // module.close() calls onModuleDestroy on all providers automatically
    await module?.close();
  });

  describe('findById with Real Redis', () => {
    it('should fetch from DB and cache in Redis on first call', async () => {
      // Arrange
      baseRepository.findById.mockResolvedValue(mockAlbum);

      // Act
      const result = await cachedRepository.findById('album-test-1');

      // Assert - Verificar que se llamó al repository
      expect(baseRepository.findById).toHaveBeenCalledWith('album-test-1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('album-test-1');

      // Verificar que se guardó en Redis
      const cached = await redisService.get('album:album-test-1');
      expect(cached).toBeDefined();
      expect(cached.id).toBe('album-test-1');
      expect(cached.name).toBe('Integration Test Album');
    });

    it('should return from Redis cache on second call (cache hit)', async () => {
      // Arrange - Primera llamada para cachear
      baseRepository.findById.mockResolvedValue(mockAlbum);
      await cachedRepository.findById('album-test-1');

      // Reset mock para verificar que no se llama en la segunda vez
      jest.clearAllMocks();

      // Act - Segunda llamada (debería venir de cache)
      const result = await cachedRepository.findById('album-test-1');

      // Assert - NO debería llamar al repository (viene de cache)
      expect(baseRepository.findById).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.id).toBe('album-test-1');
      expect(result?.name).toBe('Integration Test Album');
    });

    it('should return null if album not found in DB or cache', async () => {
      // Arrange
      baseRepository.findById.mockResolvedValue(null);

      // Act
      const result = await cachedRepository.findById('non-existent');

      // Assert
      expect(baseRepository.findById).toHaveBeenCalledWith('non-existent');
      expect(result).toBeNull();

      // Verificar que no se guardó nada en cache
      const cached = await redisService.get('album:non-existent');
      expect(cached).toBeNull();
    });

    it('should refetch from DB when cache is manually cleared', async () => {
      // Arrange
      baseRepository.findById.mockResolvedValue(mockAlbum);

      // Act - Primera llamada (cachea)
      await cachedRepository.findById('album-test-1');
      expect(baseRepository.findById).toHaveBeenCalledTimes(1);

      // Verificar que está en cache
      const cachedBefore = await redisService.get('album:album-test-1');
      expect(cachedBefore).toBeDefined();

      // Simular expiración limpiando manualmente
      await redisService.del('album:album-test-1');

      // Act - Segunda llamada (cache miss, debe ir a DB)
      jest.clearAllMocks();
      await cachedRepository.findById('album-test-1');

      // Assert - Debería llamar al repository de nuevo
      expect(baseRepository.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('create with Real Redis', () => {
    it('should create album and invalidate search caches (not cache the item)', async () => {
      // Arrange
      const newAlbum = Album.create({
        name: 'New Album',
        artistId: 'artist-1',
        artistName: 'New Artist',
        coverArtPath: '/covers/new.jpg',
        year: 2024,
        releaseDate: new Date('2024-03-01'),
        compilation: false,
        songCount: 12,
        duration: 3000,
        size: 120000000,
      });

      baseRepository.create.mockResolvedValue(newAlbum);

      // Act
      const result = await cachedRepository.create(newAlbum);

      // Assert
      expect(baseRepository.create).toHaveBeenCalledWith(newAlbum);
      expect(result).toBeDefined();

      // Note: BaseCachedRepository.create() does NOT cache the item
      // It only invalidates search caches - this is intentional design
      // A subsequent findById would cache it
    });
  });

  describe('update with Real Redis', () => {
    it('should update album and invalidate cache', async () => {
      // Arrange - Cachear primero
      baseRepository.findById.mockResolvedValue(mockAlbum);
      await cachedRepository.findById('album-test-1');

      // Verificar que está en cache
      let cached = await redisService.get('album:album-test-1');
      expect(cached).toBeDefined();

      // Act - Actualizar (interface: update(id, partial))
      const updatedAlbum = Album.reconstruct({
        ...mockAlbumData,
        name: 'Updated Title',
      });
      baseRepository.update.mockResolvedValue(updatedAlbum);
      await cachedRepository.update('album-test-1', { name: 'Updated Title' } as Partial<Album>);

      // Assert - Cache debería estar invalidado
      cached = await redisService.get('album:album-test-1');
      expect(cached).toBeNull();
    });
  });

  describe('delete with Real Redis', () => {
    it('should delete album and invalidate cache', async () => {
      // Arrange - Cachear primero
      baseRepository.findById.mockResolvedValue(mockAlbum);
      await cachedRepository.findById('album-test-1');

      // Verificar que está en cache
      let cached = await redisService.get('album:album-test-1');
      expect(cached).toBeDefined();

      // Act - Eliminar (delete returns boolean, not void)
      baseRepository.delete.mockResolvedValue(true);
      await cachedRepository.delete('album-test-1');

      // Assert - Cache debería estar invalidado
      cached = await redisService.get('album:album-test-1');
      expect(cached).toBeNull();
      expect(baseRepository.delete).toHaveBeenCalledWith('album-test-1');
    });
  });

  describe('Multiple Albums Caching', () => {
    it('should cache multiple albums independently', async () => {
      // Arrange
      const album1 = Album.reconstruct({
        ...mockAlbumData,
        id: 'album-1',
        name: 'Album 1',
      });
      const album2 = Album.reconstruct({
        ...mockAlbumData,
        id: 'album-2',
        name: 'Album 2',
      });
      const album3 = Album.reconstruct({
        ...mockAlbumData,
        id: 'album-3',
        name: 'Album 3',
      });

      baseRepository.findById
        .mockResolvedValueOnce(album1)
        .mockResolvedValueOnce(album2)
        .mockResolvedValueOnce(album3);

      // Act - Cachear todos
      await cachedRepository.findById('album-1');
      await cachedRepository.findById('album-2');
      await cachedRepository.findById('album-3');

      // Assert - Todos deberían estar en cache
      const cached1 = await redisService.get('album:album-1');
      const cached2 = await redisService.get('album:album-2');
      const cached3 = await redisService.get('album:album-3');

      expect(cached1?.name).toBe('Album 1');
      expect(cached2?.name).toBe('Album 2');
      expect(cached3?.name).toBe('Album 3');

      // Segunda ronda - deberían venir de cache
      jest.clearAllMocks();
      await cachedRepository.findById('album-1');
      await cachedRepository.findById('album-2');
      await cachedRepository.findById('album-3');

      expect(baseRepository.findById).not.toHaveBeenCalled();
    });

    it('should invalidate ALL album caches on update (consistency design)', async () => {
      // Arrange - Cachear dos álbumes
      const album1 = Album.reconstruct({
        ...mockAlbumData,
        id: 'album-1',
        name: 'Album 1',
      });
      const album2 = Album.reconstruct({
        ...mockAlbumData,
        id: 'album-2',
        name: 'Album 2',
      });

      baseRepository.findById
        .mockResolvedValueOnce(album1)
        .mockResolvedValueOnce(album2);

      await cachedRepository.findById('album-1');
      await cachedRepository.findById('album-2');

      // Verificar que ambos están en cache
      expect(await redisService.get('album:album-1')).toBeDefined();
      expect(await redisService.get('album:album-2')).toBeDefined();

      // Act - Actualizar solo album-1 (interface: update(id, partial))
      const updatedAlbum1 = Album.reconstruct({
        ...mockAlbumData,
        id: 'album-1',
        name: 'Updated Album 1',
      });
      baseRepository.update.mockResolvedValue(updatedAlbum1);
      await cachedRepository.update('album-1', { name: 'Updated Album 1' } as Partial<Album>);

      // Assert - CachedAlbumRepository.invalidateListCaches() invalida TODOS los albums
      // Esto es por diseño para garantizar consistencia de datos
      const cached1 = await redisService.get('album:album-1');
      const cached2 = await redisService.get('album:album-2');

      expect(cached1).toBeNull(); // Invalidado
      expect(cached2).toBeNull(); // También invalidado (by design)
    });
  });

  describe('Cache key format', () => {
    it('should use consistent key format: album:{id}', async () => {
      // Arrange
      baseRepository.findById.mockResolvedValue(mockAlbum);

      // Act
      await cachedRepository.findById('album-test-1');

      // Assert - Verificar formato de clave
      const cached = await redisService.get('album:album-test-1');
      expect(cached).toBeDefined();
      expect(cached.id).toBe('album-test-1');
    });
  });

  describe('Compilation albums', () => {
    it('should cache compilation albums correctly', async () => {
      // Arrange
      const compilationAlbum = Album.reconstruct({
        ...mockAlbumData,
        id: 'compilation-1',
        name: 'Greatest Hits',
        compilation: true,
        artistId: undefined,
        artistName: 'Various Artists',
      });

      baseRepository.findById.mockResolvedValue(compilationAlbum);

      // Act
      const result = await cachedRepository.findById('compilation-1');

      // Assert
      expect(result?.compilation).toBe(true);
      expect(result?.artistName).toBe('Various Artists');

      const cached = await redisService.get('album:compilation-1');
      expect(cached.compilation).toBe(true);
    });
  });
});
