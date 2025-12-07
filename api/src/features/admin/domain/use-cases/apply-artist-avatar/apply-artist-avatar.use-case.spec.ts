import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ApplyArtistAvatarUseCase } from './apply-artist-avatar.use-case';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { ImageDownloadService } from '@features/external-metadata/infrastructure/services/image-download.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { MetadataEnrichmentGateway } from '@features/external-metadata/presentation/metadata-enrichment.gateway';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('ApplyArtistAvatarUseCase', () => {
  let useCase: ApplyArtistAvatarUseCase;
  let mockDrizzle: any;
  let mockRedis: jest.Mocked<RedisService>;
  let mockImageDownload: jest.Mocked<ImageDownloadService>;
  let mockStorage: jest.Mocked<StorageService>;
  let mockImageService: jest.Mocked<ImageService>;
  let mockGateway: jest.Mocked<MetadataEnrichmentGateway>;

  const mockArtist = {
    id: 'artist-123',
    name: 'Test Artist',
    externalProfilePath: 'old-profile.jpg',
    externalBackgroundPath: null,
    externalBannerPath: null,
    externalLogoPath: null,
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock DB chain
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

    // First select returns artist, second returns updated timestamps
    mockLimit
      .mockResolvedValueOnce([mockArtist])
      .mockResolvedValueOnce([{
        externalProfileUpdatedAt: new Date(),
        externalBackgroundUpdatedAt: null,
        externalBannerUpdatedAt: null,
        externalLogoUpdatedAt: null,
      }]);

    mockRedis = {
      del: jest.fn().mockResolvedValue(1),
    } as any;

    mockImageDownload = {
      downloadAndSave: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockStorage = {
      getArtistMetadataPath: jest.fn().mockResolvedValue('/metadata/artists/artist-123'),
    } as any;

    mockImageService = {
      invalidateArtistCache: jest.fn(),
    } as any;

    mockGateway = {
      emitArtistImagesUpdated: jest.fn(),
    } as any;

    // Mock fs.unlink for deleting old files
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplyArtistAvatarUseCase,
        { provide: DrizzleService, useValue: mockDrizzle },
        { provide: RedisService, useValue: mockRedis },
        { provide: ImageDownloadService, useValue: mockImageDownload },
        { provide: StorageService, useValue: mockStorage },
        { provide: ImageService, useValue: mockImageService },
        { provide: MetadataEnrichmentGateway, useValue: mockGateway },
      ],
    }).compile();

    useCase = module.get<ApplyArtistAvatarUseCase>(ApplyArtistAvatarUseCase);
  });

  describe('execute', () => {
    const baseInput = {
      artistId: 'artist-123',
      avatarUrl: 'https://example.com/image.jpg',
      provider: 'fanart',
      type: 'profile' as const,
    };

    it('should successfully apply profile image', async () => {
      const result = await useCase.execute(baseInput);

      expect(result.success).toBe(true);
      expect(result.message).toContain('profile');
      expect(result.message).toContain('fanart');
      expect(result.imagePath).toContain('profile.jpg');
    });

    it('should successfully apply background image', async () => {
      const input = { ...baseInput, type: 'background' as const };

      const result = await useCase.execute(input);

      expect(result.success).toBe(true);
      expect(result.imagePath).toContain('background.jpg');
    });

    it('should successfully apply banner image', async () => {
      const input = { ...baseInput, type: 'banner' as const };

      const result = await useCase.execute(input);

      expect(result.success).toBe(true);
      expect(result.imagePath).toContain('banner.png');
    });

    it('should successfully apply logo image', async () => {
      const input = { ...baseInput, type: 'logo' as const };

      const result = await useCase.execute(input);

      expect(result.success).toBe(true);
      expect(result.imagePath).toContain('logo.png');
    });

    it('should throw NotFoundException if artist does not exist', async () => {
      mockDrizzle.db.limit.mockReset();
      mockDrizzle.db.limit.mockResolvedValueOnce([]);

      await expect(useCase.execute(baseInput)).rejects.toThrow(NotFoundException);
    });

    it('should delete old external image if exists', async () => {
      await useCase.execute(baseInput);

      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('old-profile.jpg'),
      );
    });

    it('should not fail if old image deletion fails', async () => {
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await useCase.execute(baseInput);

      expect(result.success).toBe(true);
    });

    it('should download image to correct path', async () => {
      await useCase.execute(baseInput);

      expect(mockStorage.getArtistMetadataPath).toHaveBeenCalledWith('artist-123');
      expect(mockImageDownload.downloadAndSave).toHaveBeenCalledWith(
        baseInput.avatarUrl,
        expect.stringContaining('profile.jpg'),
      );
    });

    it('should invalidate artist image cache', async () => {
      await useCase.execute(baseInput);

      expect(mockImageService.invalidateArtistCache).toHaveBeenCalledWith('artist-123');
    });

    it('should invalidate Redis cache', async () => {
      await useCase.execute(baseInput);

      expect(mockRedis.del).toHaveBeenCalledWith('artist:artist-123');
    });

    it('should emit WebSocket event on success', async () => {
      await useCase.execute(baseInput);

      expect(mockGateway.emitArtistImagesUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          artistId: 'artist-123',
          artistName: 'Test Artist',
          imageType: 'profile',
        }),
      );
    });

    it('should throw error if download fails', async () => {
      mockImageDownload.downloadAndSave.mockRejectedValue(
        new Error('Download failed'),
      );

      await expect(useCase.execute(baseInput)).rejects.toThrow('Download failed');
    });

    it('should clear local image reference by default (replaceLocal=true)', async () => {
      await useCase.execute(baseInput);

      // Verify update was called - the set method should have been called
      expect(mockDrizzle.db.update).toHaveBeenCalled();
      expect(mockDrizzle.db.set).toHaveBeenCalled();
    });

    it('should preserve local image reference when replaceLocal=false', async () => {
      const input = { ...baseInput, replaceLocal: false };

      await useCase.execute(input);

      // Should still succeed
      expect(mockDrizzle.db.update).toHaveBeenCalled();
    });

    it('should handle different image types with correct filenames', async () => {
      const testCases = [
        { type: 'profile' as const, expectedFile: 'profile.jpg' },
        { type: 'background' as const, expectedFile: 'background.jpg' },
        { type: 'banner' as const, expectedFile: 'banner.png' },
        { type: 'logo' as const, expectedFile: 'logo.png' },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        mockDrizzle.db.limit
          .mockResolvedValueOnce([mockArtist])
          .mockResolvedValueOnce([{}]);

        const input = { ...baseInput, type: testCase.type };
        const result = await useCase.execute(input);

        expect(result.imagePath).toContain(testCase.expectedFile);
      }
    });
  });
});
