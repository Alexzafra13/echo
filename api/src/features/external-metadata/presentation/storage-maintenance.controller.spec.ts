import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageMaintenanceController } from './storage-maintenance.controller';
import { CleanupService } from '../infrastructure/services/cleanup.service';
import { StorageService } from '../infrastructure/services/storage.service';
import { getLoggerToken } from 'nestjs-pino';

describe('StorageMaintenanceController', () => {
  let controller: StorageMaintenanceController;
  let cleanupService: jest.Mocked<CleanupService>;
  let storageService: jest.Mocked<StorageService>;
  let configService: jest.Mocked<ConfigService>;

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageMaintenanceController],
      providers: [
        {
          provide: getLoggerToken(StorageMaintenanceController.name),
          useValue: mockLogger,
        },
        {
          provide: CleanupService,
          useValue: {
            getStorageStats: jest.fn(),
            cleanupOrphanedFiles: jest.fn(),
            runFullCleanup: jest.fn(),
            recalculateStorageSizes: jest.fn(),
            verifyIntegrity: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            getBasePath: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StorageMaintenanceController>(StorageMaintenanceController);
    cleanupService = module.get(CleanupService);
    storageService = module.get(StorageService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStorageStats', () => {
    it('should return storage statistics with MB conversions', async () => {
      const mockStats = {
        totalSize: 1073741824, // 1GB in bytes
        artistsWithMetadata: 100,
        albumsWithCovers: 500,
        totalFiles: 1000,
        orphanedFiles: 5,
        avgSizePerArtist: 10737418, // ~10MB
      };

      cleanupService.getStorageStats.mockResolvedValue(mockStats);

      const result = await controller.getStorageStats();

      expect(result.totalSize).toBe(1073741824);
      expect(result.totalSizeMB).toBe(1024);
      expect(result.artistsWithMetadata).toBe(100);
      expect(result.avgSizePerArtistMB).toBeCloseTo(10.24, 1);
    });

    it('should propagate errors', async () => {
      cleanupService.getStorageStats.mockRejectedValue(new Error('Storage error'));

      await expect(controller.getStorageStats()).rejects.toThrow('Storage error');
    });
  });

  describe('getStoragePaths', () => {
    it('should return configured storage paths', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'DATA_PATH') return '/app/data';
        if (key === 'MUSIC_LIBRARY_PATH') return '/music';
        return undefined;
      });

      storageService.getBasePath.mockResolvedValue('/app/data/metadata');

      const result = await controller.getStoragePaths();

      // Normalizar rutas para Windows (reemplazar \ por /)
      const normalize = (path: string) => path.replace(/\\/g, '/');

      expect(result.dataPath).toBe('/app/data');
      expect(result.musicPath).toBe('/music');
      expect(result.metadataPath).toBe('/app/data/metadata');
      expect(normalize(result.albumCoversPath)).toBe('/app/data/metadata/albums');
      expect(normalize(result.artistImagesPath)).toBe('/app/data/metadata/artists');
      expect(result.isReadOnlyMusic).toBe(true);
    });
  });

  describe('cleanupOrphanedFiles', () => {
    it('should cleanup orphaned files (dry run by default)', async () => {
      const mockResult = {
        filesRemoved: 0,
        spaceFree: 0,
        orphanedFiles: ['file1.jpg', 'file2.png'],
        errors: [],
        duration: 150,
      };

      cleanupService.cleanupOrphanedFiles.mockResolvedValue(mockResult);

      const result = await controller.cleanupOrphanedFiles(undefined);

      expect(cleanupService.cleanupOrphanedFiles).toHaveBeenCalledWith(true);
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.orphanedFiles).toHaveLength(2);
    });

    it('should actually delete files when dryRun=false', async () => {
      const mockResult = {
        filesRemoved: 2,
        spaceFree: 5242880, // 5MB
        orphanedFiles: ['file1.jpg', 'file2.png'],
        errors: [],
        duration: 200,
      };

      cleanupService.cleanupOrphanedFiles.mockResolvedValue(mockResult);

      const result = await controller.cleanupOrphanedFiles('false');

      expect(cleanupService.cleanupOrphanedFiles).toHaveBeenCalledWith(false);
      expect(result.filesRemoved).toBe(2);
      expect(result.spaceFreeMB).toBe(5);
      expect(result.dryRun).toBe(false);
    });

    it('should handle errors during cleanup', async () => {
      const mockResult = {
        filesRemoved: 1,
        spaceFree: 1024,
        orphanedFiles: ['file1.jpg'],
        errors: ['Failed to delete file2.png'],
        duration: 100,
      };

      cleanupService.cleanupOrphanedFiles.mockResolvedValue(mockResult);

      const result = await controller.cleanupOrphanedFiles('false');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('runFullCleanup', () => {
    it('should run full cleanup with both files and cache', async () => {
      const mockResult = {
        files: {
          filesRemoved: 5,
          spaceFree: 10485760, // 10MB
          orphanedFiles: ['f1.jpg', 'f2.jpg'],
          errors: [],
          duration: 300,
        },
        cache: {
          entriesRemoved: 50,
          errors: [],
        },
      };

      cleanupService.runFullCleanup.mockResolvedValue(mockResult);

      const result = await controller.runFullCleanup('true');

      expect(result.success).toBe(true);
      expect(result.files.filesRemoved).toBe(5);
      expect(result.files.spaceFreeMB).toBe(10);
      expect(result.cache.entriesRemoved).toBe(50);
      expect(result.dryRun).toBe(true);
    });
  });

  describe('recalculateStorageSizes', () => {
    it('should recalculate storage sizes successfully', async () => {
      const mockResult = {
        updated: 150,
        errors: [],
      };

      cleanupService.recalculateStorageSizes.mockResolvedValue(mockResult);

      const result = await controller.recalculateStorageSizes();

      expect(result.success).toBe(true);
      expect(result.updated).toBe(150);
      expect(result.errors).toHaveLength(0);
    });

    it('should return failure when there are errors', async () => {
      const mockResult = {
        updated: 100,
        errors: ['Failed to calculate artist-1', 'Failed to calculate artist-2'],
      };

      cleanupService.recalculateStorageSizes.mockResolvedValue(mockResult);

      const result = await controller.recalculateStorageSizes();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('verifyIntegrity', () => {
    it('should verify integrity successfully with no missing files', async () => {
      const mockResult = {
        totalChecked: 1000,
        missing: [],
        errors: [],
      };

      cleanupService.verifyIntegrity.mockResolvedValue(mockResult);

      const result = await controller.verifyIntegrity();

      expect(result.success).toBe(true);
      expect(result.totalChecked).toBe(1000);
      expect(result.missingCount).toBe(0);
    });

    it('should report missing files', async () => {
      const mockResult = {
        totalChecked: 1000,
        missing: ['/path/to/missing1.jpg', '/path/to/missing2.jpg'],
        errors: [],
      };

      cleanupService.verifyIntegrity.mockResolvedValue(mockResult);

      const result = await controller.verifyIntegrity();

      expect(result.success).toBe(false);
      expect(result.missingCount).toBe(2);
      expect(result.missing).toEqual(['/path/to/missing1.jpg', '/path/to/missing2.jpg']);
    });
  });
});
