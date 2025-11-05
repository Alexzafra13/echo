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
      },
      album: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const mockStorage = {
      getArtistMetadataPath: jest.fn(),
      getAlbumCoverPath: jest.fn(),
      getMetadataBasePath: jest.fn().mockReturnValue('/storage/metadata'),
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
      storage.getMetadataBasePath.mockReturnValue('/storage/metadata');
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
      storage.getMetadataBasePath.mockReturnValue('/storage/metadata');

      // Simular carpetas de artistas en disco
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['artists', 'albums']) // Base directory
        .mockResolvedValueOnce(['artist-123', 'artist-456']) // Artists directory
        .mockResolvedValueOnce([]) // Albums directory
        .mockResolvedValueOnce(['profile-small.jpg', 'profile-medium.jpg']) // artist-123
        .mockResolvedValueOnce(['profile-small.jpg']); // artist-456

      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => false,
        size: 1024,
      });

      // Solo existe artist-123 en BD, artist-456 es huérfano
      prisma.artist.findMany.mockResolvedValue([
        { id: 'artist-123', name: 'Artist 123' },
      ] as any);

      prisma.album.findMany.mockResolvedValue([]);

      // Act
      const result = await service.cleanupOrphanedFiles(true);

      // Assert
      expect(result.filesRemoved).toBe(0); // Dry-run no elimina
      expect(result.orphanedFiles.length).toBeGreaterThan(0);
    });

    it('debería eliminar archivos huérfanos en modo real', async () => {
      // Arrange
      storage.getMetadataBasePath.mockReturnValue('/storage/metadata');

      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['artists', 'albums'])
        .mockResolvedValueOnce(['artist-orphan'])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['profile.jpg']);

      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => false,
        size: 2048,
      });

      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
      (fs.rmdir as jest.Mock).mockResolvedValue(undefined);

      // No hay artistas en BD, todos son huérfanos
      prisma.artist.findMany.mockResolvedValue([]);
      prisma.album.findMany.mockResolvedValue([]);

      // Act
      const result = await service.cleanupOrphanedFiles(false);

      // Assert
      expect(result.filesRemoved).toBeGreaterThan(0);
      expect(result.spaceFree).toBeGreaterThan(0);
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('debería manejar errores durante la limpieza', async () => {
      // Arrange
      storage.getMetadataBasePath.mockReturnValue('/storage/metadata');
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

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
      prisma.$queryRaw
        .mockResolvedValueOnce([{ total: '5242880' }]) // Total size (5 MB)
        .mockResolvedValueOnce([{ count: 10 }]) // Artists with metadata
        .mockResolvedValueOnce([{ count: 20 }]); // Albums with covers

      storage.getMetadataBasePath.mockReturnValue('/storage/metadata');

      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['artists', 'albums'])
        .mockResolvedValueOnce(['artist-1', 'artist-2'])
        .mockResolvedValueOnce(['album-1', 'album-2', 'album-3'])
        .mockResolvedValueOnce(['profile.jpg'])
        .mockResolvedValueOnce(['cover.jpg'])
        .mockResolvedValueOnce(['cover.jpg'])
        .mockResolvedValueOnce(['cover.jpg'])
        .mockResolvedValueOnce(['cover.jpg']);

      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => false,
        size: 1024,
      });

      prisma.artist.findMany.mockResolvedValue([
        { id: 'artist-1' },
        { id: 'artist-2' },
      ] as any);

      prisma.album.findMany.mockResolvedValue([
        { id: 'album-1' },
        { id: 'album-2' },
        { id: 'album-3' },
      ] as any);

      // Act
      const result = await service.getStorageStats();

      // Assert
      expect(result.totalSize).toBe(5242880);
      expect(result.artistsWithMetadata).toBe(10);
      expect(result.albumsWithCovers).toBe(20);
      expect(result.totalFiles).toBeGreaterThan(0);
      expect(result.avgSizePerArtist).toBeGreaterThan(0);
    });

    it('debería manejar caso sin metadatos', async () => {
      // Arrange
      prisma.$queryRaw
        .mockResolvedValueOnce([{ total: null }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }]);

      storage.getMetadataBasePath.mockReturnValue('/storage/metadata');
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      prisma.artist.findMany.mockResolvedValue([]);
      prisma.album.findMany.mockResolvedValue([]);

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

  describe('recalculateArtistStorageSize', () => {
    it('debería recalcular el tamaño de almacenamiento de un artista', async () => {
      // Arrange
      const artistId = 'artist-123';
      storage.getArtistMetadataPath.mockReturnValue('/storage/artists/artist-123');

      (fs.readdir as jest.Mock).mockResolvedValue([
        'profile-small.jpg',
        'profile-medium.jpg',
        'profile-large.jpg',
      ]);

      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => false,
        size: 1024, // 1 KB cada archivo
      });

      prisma.artist.update.mockResolvedValue({
        id: artistId,
        metadataStorageSize: BigInt(3072), // 3 KB
      } as any);

      // Act
      const result = await service.recalculateArtistStorageSize(artistId);

      // Assert
      expect(result).toBe(3072);
      expect(prisma.artist.update).toHaveBeenCalledWith({
        where: { id: artistId },
        data: { metadataStorageSize: BigInt(3072) },
      });
    });

    it('debería retornar 0 si no hay archivos', async () => {
      // Arrange
      const artistId = 'artist-123';
      storage.getArtistMetadataPath.mockReturnValue('/storage/artists/artist-123');
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      prisma.artist.update.mockResolvedValue({
        id: artistId,
        metadataStorageSize: BigInt(0),
      } as any);

      // Act
      const result = await service.recalculateArtistStorageSize(artistId);

      // Assert
      expect(result).toBe(0);
    });

    it('debería manejar errores de filesystem', async () => {
      // Arrange
      const artistId = 'artist-123';
      storage.getArtistMetadataPath.mockReturnValue('/storage/artists/artist-123');
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Directory not found'));

      prisma.artist.update.mockResolvedValue({
        id: artistId,
        metadataStorageSize: BigInt(0),
      } as any);

      // Act
      const result = await service.recalculateArtistStorageSize(artistId);

      // Assert
      expect(result).toBe(0);
      expect(prisma.artist.update).toHaveBeenCalledWith({
        where: { id: artistId },
        data: { metadataStorageSize: BigInt(0) },
      });
    });
  });

  describe('verifyIntegrity', () => {
    it('debería verificar integridad de archivos referenciados', async () => {
      // Arrange
      prisma.artist.findMany.mockResolvedValue([
        {
          id: 'artist-1',
          name: 'Artist 1',
          smallImageUrl: '/artists/artist-1/profile-small.jpg',
          mediumImageUrl: '/artists/artist-1/profile-medium.jpg',
          largeImageUrl: '/artists/artist-1/profile-large.jpg',
        },
      ] as any);

      prisma.album.findMany.mockResolvedValue([
        {
          id: 'album-1',
          name: 'Album 1',
          externalCoverPath: '/albums/album-1/cover.jpg',
        },
      ] as any);

      // Simular que todos los archivos existen
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.verifyIntegrity();

      // Assert
      expect(result.totalChecked).toBeGreaterThan(0);
      expect(result.missingFiles).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('debería detectar archivos faltantes', async () => {
      // Arrange
      prisma.artist.findMany.mockResolvedValue([
        {
          id: 'artist-1',
          name: 'Artist 1',
          smallImageUrl: '/artists/artist-1/profile-small.jpg',
        },
      ] as any);

      prisma.album.findMany.mockResolvedValue([]);

      // Simular que el archivo no existe
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

      // Act
      const result = await service.verifyIntegrity();

      // Assert
      expect(result.totalChecked).toBeGreaterThan(0);
      expect(result.missingFiles.length).toBeGreaterThan(0);
    });

    it('debería manejar caso sin archivos para verificar', async () => {
      // Arrange
      prisma.artist.findMany.mockResolvedValue([]);
      prisma.album.findMany.mockResolvedValue([]);

      // Act
      const result = await service.verifyIntegrity();

      // Assert
      expect(result.totalChecked).toBe(0);
      expect(result.missingFiles).toEqual([]);
    });
  });
});
