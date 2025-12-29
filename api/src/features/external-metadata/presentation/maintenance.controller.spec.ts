import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MaintenanceController } from './maintenance.controller';
import { CleanupService } from '../infrastructure/services/cleanup.service';
import { EnrichmentQueueService } from '../infrastructure/services/enrichment-queue.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { StorageService } from '../infrastructure/services/storage.service';
import { getLoggerToken } from 'nestjs-pino';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
}));

describe('MaintenanceController', () => {
  let controller: MaintenanceController;
  let cleanupService: jest.Mocked<CleanupService>;
  let enrichmentQueue: jest.Mocked<EnrichmentQueueService>;
  let drizzleService: jest.Mocked<DrizzleService>;
  let storageService: jest.Mocked<StorageService>;
  let configService: jest.Mocked<ConfigService>;

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const mockDb = {
      select: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceController],
      providers: [
        {
          provide: getLoggerToken(MaintenanceController.name),
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
          provide: EnrichmentQueueService,
          useValue: {
            getQueueStats: jest.fn(),
            startEnrichmentQueue: jest.fn(),
            stopEnrichmentQueue: jest.fn(),
          },
        },
        {
          provide: DrizzleService,
          useValue: {
            db: mockDb,
          },
        },
        {
          provide: StorageService,
          useValue: {
            getBasePath: jest.fn(),
            directoryExists: jest.fn(),
            fileExists: jest.fn(),
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

    controller = module.get<MaintenanceController>(MaintenanceController);
    cleanupService = module.get(CleanupService);
    enrichmentQueue = module.get(EnrichmentQueueService);
    drizzleService = module.get(DrizzleService);
    storageService = module.get(StorageService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Storage endpoints
  // ============================================

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
      configService.get.mockImplementation((key: string, defaultValue: string) => {
        if (key === 'DATA_PATH') return '/app/data';
        if (key === 'MUSIC_LIBRARY_PATH') return '/music';
        return defaultValue;
      });

      storageService.getBasePath.mockResolvedValue('/app/data/metadata');

      const result = await controller.getStoragePaths();

      expect(result.dataPath).toBe('/app/data');
      expect(result.musicPath).toBe('/music');
      expect(result.metadataPath).toBe('/app/data/metadata');
      expect(result.albumCoversPath).toBe('/app/data/metadata/albums');
      expect(result.artistImagesPath).toBe('/app/data/metadata/artists');
      expect(result.isReadOnlyMusic).toBe(true);
    });
  });

  // ============================================
  // Cleanup endpoints
  // ============================================

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

  // ============================================
  // Verify endpoints
  // ============================================

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

  // ============================================
  // Artist image cleaning endpoints
  // ============================================

  describe('cleanArtistImageUrls', () => {
    it('should clean incorrect artist image URLs', async () => {
      const mockArtists = [
        {
          id: 'artist-1',
          name: 'Artist 1',
          externalProfilePath: 'file:///some/path.jpg',
          externalBackgroundPath: null,
          externalBannerPath: '/api/artists/1/banner',
          externalLogoPath: null,
        },
      ];

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockArtists),
      };

      const updateChain = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };

      (drizzleService.db.select as jest.Mock).mockReturnValue(selectChain);
      (drizzleService.db.update as jest.Mock).mockReturnValue(updateChain);

      const result = await controller.cleanArtistImageUrls();

      expect(result.success).toBe(true);
      expect(result.cleaned).toBe(1);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should not clean valid file system paths', async () => {
      const mockArtists = [
        {
          id: 'artist-1',
          name: 'Artist 1',
          externalProfilePath: '/app/data/metadata/artists/artist-1/profile.jpg',
          externalBackgroundPath: null,
          externalBannerPath: null,
          externalLogoPath: null,
        },
      ];

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockArtists),
      };

      (drizzleService.db.select as jest.Mock).mockReturnValue(selectChain);

      const result = await controller.cleanArtistImageUrls();

      expect(result.cleaned).toBe(0);
      expect(drizzleService.db.update).not.toHaveBeenCalled();
    });
  });

  describe('syncArtistImages', () => {
    it('should return early when artists directory does not exist', async () => {
      storageService.getBasePath.mockResolvedValue('/app/data/metadata');
      storageService.directoryExists.mockResolvedValue(false);

      const result = await controller.syncArtistImages();

      expect(result.success).toBe(true);
      expect(result.synced).toBe(0);
      expect(result.filesFound).toBe(0);
    });
  });

  describe('populateSortNames', () => {
    it('should populate sort names for albums and artists', async () => {
      const mockAlbums = [
        { id: 'album-1', name: 'The Album' },
        { id: 'album-2', name: 'An Album' },
      ];

      const mockArtists = [
        { id: 'artist-1', name: 'The Artist' },
      ];

      let selectCallCount = 0;
      const selectChain = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return Promise.resolve(mockAlbums);
          return Promise.resolve(mockArtists);
        }),
      };

      const updateChain = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };

      (drizzleService.db.select as jest.Mock).mockReturnValue(selectChain);
      (drizzleService.db.update as jest.Mock).mockReturnValue(updateChain);

      const result = await controller.populateSortNames();

      expect(result.success).toBe(true);
      expect(result.albumsUpdated).toBe(2);
      expect(result.artistsUpdated).toBe(1);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // Enrichment queue endpoints
  // ============================================

  describe('getEnrichmentQueueStats', () => {
    it('should return queue statistics', async () => {
      const mockStats = {
        isRunning: true,
        pendingArtists: 50,
        pendingAlbums: 200,
        totalPending: 250,
        processedInSession: 100,
        currentItem: 'Artist Name',
        startedAt: new Date().toISOString(),
        estimatedTimeRemaining: '2h 30m',
      };

      enrichmentQueue.getQueueStats.mockResolvedValue(mockStats);

      const result = await controller.getEnrichmentQueueStats();

      expect(result.isRunning).toBe(true);
      expect(result.pendingArtists).toBe(50);
      expect(result.pendingAlbums).toBe(200);
      expect(result.currentItem).toBe('Artist Name');
    });
  });

  describe('startEnrichmentQueue', () => {
    it('should start the enrichment queue', async () => {
      const mockResult = {
        started: true,
        pending: 250,
        message: 'Enrichment queue started',
      };

      enrichmentQueue.startEnrichmentQueue.mockResolvedValue(mockResult);

      const result = await controller.startEnrichmentQueue();

      expect(result.started).toBe(true);
      expect(result.pending).toBe(250);
      expect(enrichmentQueue.startEnrichmentQueue).toHaveBeenCalled();
    });

    it('should handle already running queue', async () => {
      const mockResult = {
        started: false,
        pending: 0,
        message: 'Queue already running',
      };

      enrichmentQueue.startEnrichmentQueue.mockResolvedValue(mockResult);

      const result = await controller.startEnrichmentQueue();

      expect(result.started).toBe(false);
    });
  });

  describe('stopEnrichmentQueue', () => {
    it('should stop the enrichment queue', async () => {
      enrichmentQueue.stopEnrichmentQueue.mockResolvedValue(undefined);

      const result = await controller.stopEnrichmentQueue();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Enrichment queue stopped');
      expect(enrichmentQueue.stopEnrichmentQueue).toHaveBeenCalled();
    });

    it('should propagate errors', async () => {
      enrichmentQueue.stopEnrichmentQueue.mockRejectedValue(new Error('Stop failed'));

      await expect(controller.stopEnrichmentQueue()).rejects.toThrow('Stop failed');
    });
  });
});
