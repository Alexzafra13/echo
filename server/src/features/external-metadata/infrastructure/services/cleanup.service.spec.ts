import { Test, TestingModule } from '@nestjs/testing';
import { CleanupService } from './cleanup.service';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { StorageService } from './storage.service';
import * as fs from 'fs/promises';

// Mock fs/promises
jest.mock('fs/promises');

describe('CleanupService', () => {
  let service: CleanupService;
  let prisma: jest.Mocked<PrismaService>;
  let storage: jest.Mocked<StorageService>;

  beforeEach(async () => {
    // Create mock services
    const mockPrisma = {
      artist: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      album: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockStorage = {
      getArtistMetadataPath: jest.fn(),
      getAlbumCoverPath: jest.fn(),
      getStoragePath: jest.fn().mockResolvedValue('/storage/metadata'),
      getStorageSize: jest.fn().mockResolvedValue(1024),
      ensureDirectoryExists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: StorageService,
          useValue: mockStorage,
        },
      ],
    }).compile();

    service = module.get<CleanupService>(CleanupService);
    prisma = module.get(PrismaService);
    storage = module.get(StorageService);

    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanupOrphanedFiles', () => {
    it('debería ejecutar en modo dry-run sin eliminar archivos', async () => {
      // Arrange
      storage.getStoragePath.mockResolvedValue('/storage/metadata');
      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined) // artists dir exists
        .mockResolvedValueOnce(undefined); // albums dir exists
      (fs.readdir as jest.Mock).mockResolvedValue([]);
      prisma.artist.findMany.mockResolvedValue([]);
      prisma.album.findMany.mockResolvedValue([]);

      // Act
      const result = await service.cleanupOrphanedFiles(true);

      // Assert
      expect(result.filesRemoved).toBe(0);
      expect(result.spaceFree).toBe(0);
      expect(result.orphanedFiles).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('debería detectar archivos huérfanos sin eliminarlos (dry-run)', async () => {
      // Arrange
      storage.getStoragePath.mockResolvedValue('/storage/metadata');
      storage.getStorageSize.mockResolvedValue(2048);

      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined) // artists dir exists
        .mockResolvedValueOnce(undefined); // albums dir exists

      // Orden correcto de llamadas a fs.readdir:
      // 1. cleanupArtistFiles: fs.readdir(artistsPath) → ['artist-orphan']
      // 2. listAllFiles: fs.readdir(dirPath, {withFileTypes: true}) → [{name: 'profile.jpg'}]
      // 3. cleanupAlbumFiles: fs.readdir(albumsPath) → []
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['artist-orphan']) // 1: Lista artists
        .mockResolvedValueOnce([{ name: 'profile.jpg', isDirectory: () => false }]) // 2: Lista archivos CON withFileTypes
        .mockResolvedValueOnce([]); // 3: Lista albums

      // Solo existe artist-123 en BD, artist-orphan es huérfano
      prisma.artist.findMany.mockResolvedValue([
        { id: 'artist-123' },
      ] as any);

      prisma.album.findMany.mockResolvedValue([]);

      // Act
      const result = await service.cleanupOrphanedFiles(true);

      // Assert
      expect(result.filesRemoved).toBeGreaterThan(0);
      expect(result.orphanedFiles.length).toBeGreaterThan(0);
    });

    it('debería eliminar archivos huérfanos en modo real', async () => {
      // Arrange
      storage.getStoragePath.mockResolvedValue('/storage/metadata');
      storage.getStorageSize.mockResolvedValue(2048);

      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined) // artists dir exists
        .mockResolvedValueOnce(undefined); // albums dir exists

      // Orden correcto de llamadas a fs.readdir:
      // 1. cleanupArtistFiles: fs.readdir(artistsPath) → ['artist-orphan']
      // 2. listAllFiles: fs.readdir(dirPath, {withFileTypes: true}) → [{name: 'profile.jpg'}]
      // 3. cleanupAlbumFiles: fs.readdir(albumsPath) → []
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['artist-orphan']) // 1: Lista artists
        .mockResolvedValueOnce([{ name: 'profile.jpg', isDirectory: () => false }]) // 2: Lista archivos CON withFileTypes
        .mockResolvedValueOnce([]); // 3: Lista albums

      (fs.rm as jest.Mock).mockResolvedValue(undefined);

      // No hay artistas en BD, todos son huérfanos
      prisma.artist.findMany.mockResolvedValue([]);
      prisma.album.findMany.mockResolvedValue([]);

      // Act
      const result = await service.cleanupOrphanedFiles(false);

      // Assert
      expect(result.filesRemoved).toBeGreaterThan(0);
      expect(result.spaceFree).toBeGreaterThan(0);
      expect(fs.rm).toHaveBeenCalled();
    });

    it('debería manejar errores durante la limpieza', async () => {
      // Arrange
      storage.getStoragePath.mockRejectedValue(new Error('Permission denied'));

      // Act
      const result = await service.cleanupOrphanedFiles(true);

      // Assert
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.filesRemoved).toBe(0);
    });
  });

  describe('getStorageStats', () => {
    it('debería calcular estadísticas de almacenamiento', async () => {
      // Arrange
      prisma.artist.count.mockResolvedValue(10);
      prisma.album.count.mockResolvedValue(20);
      prisma.artist.aggregate.mockResolvedValue({
        _sum: { metadataStorageSize: BigInt(5242880) },
      } as any);

      storage.getStoragePath.mockResolvedValue('/storage/metadata');

      (fs.readdir as jest.Mock).mockResolvedValue([
        { name: 'profile.jpg', isDirectory: () => false },
      ] as any);

      // Act
      const result = await service.getStorageStats();

      // Assert
      expect(result.totalSize).toBe(5242880);
      expect(result.artistsWithMetadata).toBe(10);
      expect(result.albumsWithCovers).toBe(20);
      expect(result.totalFiles).toBeGreaterThanOrEqual(0);
      expect(result.avgSizePerArtist).toBeGreaterThan(0);
    });

    it('debería manejar caso sin metadatos', async () => {
      // Arrange
      prisma.artist.count.mockResolvedValue(0);
      prisma.album.count.mockResolvedValue(0);
      prisma.artist.aggregate.mockResolvedValue({
        _sum: { metadataStorageSize: null },
      } as any);

      storage.getStoragePath.mockResolvedValue('/storage/metadata');
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getStorageStats();

      // Assert
      expect(result.totalSize).toBe(0);
      expect(result.artistsWithMetadata).toBe(0);
      expect(result.albumsWithCovers).toBe(0);
      expect(result.totalFiles).toBe(0);
      expect(result.avgSizePerArtist).toBe(0);
    });
  });

  describe('recalculateStorageSizes', () => {
    it('debería recalcular tamaños para todos los artistas', async () => {
      // Arrange
      prisma.artist.findMany.mockResolvedValue([
        { id: 'artist-1', name: 'Artist 1' },
        { id: 'artist-2', name: 'Artist 2' },
      ] as any);

      storage.getArtistMetadataPath.mockResolvedValue('/storage/artists/artist-1');
      storage.getStorageSize.mockResolvedValue(3072);

      prisma.artist.update.mockResolvedValue({
        id: 'artist-1',
        metadataStorageSize: BigInt(3072),
      } as any);

      // Act
      const result = await service.recalculateStorageSizes();

      // Assert
      expect(result.updated).toBe(2);
      expect(result.errors).toEqual([]);
      expect(prisma.artist.update).toHaveBeenCalledTimes(2);
    });

    it('debería manejar errores individuales sin fallar todo', async () => {
      // Arrange
      prisma.artist.findMany.mockResolvedValue([
        { id: 'artist-1', name: 'Artist 1' },
        { id: 'artist-2', name: 'Artist 2' },
      ] as any);

      storage.getArtistMetadataPath
        .mockResolvedValueOnce('/storage/artists/artist-1')
        .mockRejectedValueOnce(new Error('Directory not found'));

      storage.getStorageSize.mockResolvedValue(1024);

      prisma.artist.update.mockResolvedValue({} as any);

      // Act
      const result = await service.recalculateStorageSizes();

      // Assert
      expect(result.updated).toBe(1); // Solo uno exitoso
      expect(result.errors.length).toBe(1);
    });

    it('debería retornar 0 updates si no hay artistas', async () => {
      // Arrange
      prisma.artist.findMany.mockResolvedValue([]);

      // Act
      const result = await service.recalculateStorageSizes();

      // Assert
      expect(result.updated).toBe(0);
      expect(result.errors).toEqual([]);
    });
  });

  describe('verifyIntegrity', () => {
    it('debería verificar integridad de archivos referenciados', async () => {
      // Arrange
      prisma.artist.findMany.mockResolvedValue([
        {
          id: 'artist-1',
          name: 'Artist 1',
          externalProfilePath: '/storage/artist-1/profile.jpg',
          externalBackgroundPath: '/storage/artist-1/background.jpg',
          externalBannerPath: null,
          externalLogoPath: null,
        },
      ] as any);

      prisma.album.findMany.mockResolvedValue([
        {
          id: 'album-1',
          name: 'Album 1',
          externalCoverPath: '/storage/album-1/cover.jpg',
        },
      ] as any);

      // Simular que todos los archivos existen
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.verifyIntegrity();

      // Assert
      expect(result.totalChecked).toBe(3); // 2 artist images + 1 album cover
      expect(result.missing).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('debería detectar archivos faltantes', async () => {
      // Arrange
      prisma.artist.findMany.mockResolvedValue([
        {
          id: 'artist-1',
          name: 'Artist 1',
          externalProfilePath: '/storage/artist-1/profile.jpg',
          externalBackgroundPath: null,
          externalBannerPath: null,
          externalLogoPath: null,
        },
      ] as any);

      prisma.album.findMany.mockResolvedValue([]);

      // Simular que el archivo no existe
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

      // Act
      const result = await service.verifyIntegrity();

      // Assert
      expect(result.totalChecked).toBe(1);
      expect(result.missing.length).toBe(1);
      expect(result.missing[0]).toContain('Artist 1');
    });

    it('debería manejar caso sin archivos para verificar', async () => {
      // Arrange
      prisma.artist.findMany.mockResolvedValue([]);
      prisma.album.findMany.mockResolvedValue([]);

      // Act
      const result = await service.verifyIntegrity();

      // Assert
      expect(result.totalChecked).toBe(0);
      expect(result.missing).toEqual([]);
    });
  });
});
