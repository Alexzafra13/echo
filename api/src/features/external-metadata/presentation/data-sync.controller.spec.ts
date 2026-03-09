import { Test, TestingModule } from '@nestjs/testing';
import { DataSyncController } from './data-sync.controller';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { StorageService } from '../infrastructure/services/storage.service';
import { getLoggerToken } from 'nestjs-pino';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
}));

describe('DataSyncController', () => {
  let controller: DataSyncController;
  let drizzleService: jest.Mocked<DrizzleService>;
  let storageService: jest.Mocked<StorageService>;

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
      controllers: [DataSyncController],
      providers: [
        {
          provide: getLoggerToken(DataSyncController.name),
          useValue: mockLogger,
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
      ],
    }).compile();

    controller = module.get<DataSyncController>(DataSyncController);
    drizzleService = module.get(DrizzleService);
    storageService = module.get(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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

      const mockArtists = [{ id: 'artist-1', name: 'The Artist' }];

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
});
