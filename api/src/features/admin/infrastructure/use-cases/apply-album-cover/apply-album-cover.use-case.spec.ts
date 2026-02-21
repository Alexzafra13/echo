import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getLoggerToken } from 'nestjs-pino';
import { ApplyAlbumCoverUseCase } from './apply-album-cover.use-case';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { ImageDownloadService } from '@features/external-metadata/infrastructure/services/image-download.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { MetadataEventsService } from '@features/external-metadata/infrastructure/services/metadata-events.service';
import { ImageProcessingError } from '@shared/errors';
import * as safeUtils from '@shared/utils';
import * as fs from 'fs/promises';

// Mock modules
jest.mock('fs/promises');
jest.mock('@shared/utils', () => ({
  safeDeleteFile: jest.fn().mockResolvedValue(undefined),
  fileExists: jest.fn().mockResolvedValue(false),
}));

const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  setContext: jest.fn(),
  assign: jest.fn(),
};

describe('ApplyAlbumCoverUseCase', () => {
  let useCase: ApplyAlbumCoverUseCase;
  let mockDrizzle: {
    db: {
      select: jest.Mock;
      from: jest.Mock;
      where: jest.Mock;
      limit: jest.Mock;
      update: jest.Mock;
      set: jest.Mock;
    };
  };
  let mockRedis: jest.Mocked<RedisService>;
  let mockImageDownload: jest.Mocked<ImageDownloadService>;
  let mockStorage: jest.Mocked<StorageService>;
  let mockImageService: jest.Mocked<ImageService>;
  let mockGateway: jest.Mocked<MetadataEventsService>;

  const mockAlbum = {
    id: 'album-123',
    name: 'Test Album',
    artistId: 'artist-456',
    externalCoverPath: '/old/cover.jpg',
    externalCoverSource: 'lastfm',
  };

  beforeEach(async () => {
    // Setup mock DB operations
    const mockSelect = jest.fn().mockReturnThis();
    const mockFrom = jest.fn().mockReturnThis();
    const mockWhere = jest.fn().mockReturnThis();
    const mockLimit = jest.fn();
    const mockUpdate = jest.fn().mockReturnThis();
    const mockSet = jest.fn().mockReturnThis();

    mockDrizzle = {
      db: {
        select: mockSelect,
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
        update: mockUpdate,
        set: mockSet,
      },
    };

    // First call returns album, second call returns updated album
    mockLimit
      .mockResolvedValueOnce([mockAlbum])
      .mockResolvedValueOnce([{ ...mockAlbum, externalInfoUpdatedAt: new Date() }]);

    mockRedis = {
      del: jest.fn().mockResolvedValue(1),
    } as unknown as jest.Mocked<RedisService>;

    mockImageDownload = {
      downloadAndSave: jest.fn().mockResolvedValue(undefined),
      getImageDimensionsFromFile: jest.fn().mockResolvedValue({ width: 500, height: 500 }),
    } as unknown as jest.Mocked<ImageDownloadService>;

    mockStorage = {
      getAlbumMetadataPath: jest.fn().mockResolvedValue('/metadata/albums/album-123'),
    } as unknown as jest.Mocked<StorageService>;

    mockImageService = {
      invalidateAlbumCache: jest.fn(),
    } as unknown as jest.Mocked<ImageService>;

    mockGateway = {
      emitAlbumCoverUpdated: jest.fn(),
    } as unknown as jest.Mocked<MetadataEventsService>;

    // Mock fs.rename
    (fs.rename as jest.Mock).mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplyAlbumCoverUseCase,
        { provide: getLoggerToken(ApplyAlbumCoverUseCase.name), useValue: mockLogger },
        { provide: DrizzleService, useValue: mockDrizzle },
        { provide: RedisService, useValue: mockRedis },
        { provide: ImageDownloadService, useValue: mockImageDownload },
        { provide: StorageService, useValue: mockStorage },
        { provide: ImageService, useValue: mockImageService },
        { provide: MetadataEventsService, useValue: mockGateway },
      ],
    }).compile();

    useCase = module.get<ApplyAlbumCoverUseCase>(ApplyAlbumCoverUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const input = {
      albumId: 'album-123',
      coverUrl: 'https://example.com/cover.jpg',
      provider: 'fanart',
    };

    it('should successfully apply album cover', async () => {
      const result = await useCase.execute(input);

      expect(result.success).toBe(true);
      expect(result.message).toContain('fanart');
      expect(result.coverPath).toContain('cover-500x500.jpg');
    });

    it('should delete old cover before applying new one', async () => {
      await useCase.execute(input);

      expect(safeUtils.safeDeleteFile).toHaveBeenCalledWith(
        mockAlbum.externalCoverPath,
        'old cover'
      );
    });

    it('should download cover to metadata storage path', async () => {
      await useCase.execute(input);

      expect(mockStorage.getAlbumMetadataPath).toHaveBeenCalledWith('album-123');
      expect(mockImageDownload.downloadAndSave).toHaveBeenCalledWith(
        input.coverUrl,
        expect.stringContaining('cover-temp-')
      );
    });

    it('should get image dimensions after download', async () => {
      await useCase.execute(input);

      expect(mockImageDownload.getImageDimensionsFromFile).toHaveBeenCalled();
    });

    it('should rename temp file to final name with dimensions', async () => {
      await useCase.execute(input);

      expect(fs.rename).toHaveBeenCalledWith(
        expect.stringContaining('cover-temp-'),
        expect.stringContaining('cover-500x500.jpg')
      );
    });

    it('should invalidate image cache', async () => {
      await useCase.execute(input);

      expect(mockImageService.invalidateAlbumCache).toHaveBeenCalledWith('album-123');
    });

    it('should invalidate Redis cache for album', async () => {
      await useCase.execute(input);

      expect(mockRedis.del).toHaveBeenCalledWith('album:album-123');
    });

    it('should invalidate Redis cache for artist if album has artistId', async () => {
      await useCase.execute(input);

      expect(mockRedis.del).toHaveBeenCalledWith('artist:artist-456');
    });

    it('should emit WebSocket event on success', async () => {
      await useCase.execute(input);

      expect(mockGateway.emitAlbumCoverUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          albumId: 'album-123',
          albumName: 'Test Album',
          artistId: 'artist-456',
        })
      );
    });

    it('should throw NotFoundException if album does not exist', async () => {
      mockDrizzle.db.limit.mockReset();
      mockDrizzle.db.limit.mockResolvedValueOnce([]);

      await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    });

    it('should throw ImageProcessingError if dimensions are invalid', async () => {
      mockImageDownload.getImageDimensionsFromFile.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow(ImageProcessingError);
    });

    it('should clean up temp file on download error', async () => {
      mockImageDownload.downloadAndSave.mockRejectedValue(new Error('Download failed'));

      await expect(useCase.execute(input)).rejects.toThrow('Download failed');
      expect(safeUtils.safeDeleteFile).toHaveBeenCalledWith(
        expect.stringContaining('cover-temp-'),
        'temp file cleanup'
      );
    });

    it('should delete existing cover with same dimensions before rename', async () => {
      (safeUtils.fileExists as jest.Mock).mockResolvedValue(true);

      await useCase.execute(input);

      // Should be called for old cover and for existing file with same dimensions
      expect(safeUtils.safeDeleteFile).toHaveBeenCalledTimes(2);
    });
  });
});
