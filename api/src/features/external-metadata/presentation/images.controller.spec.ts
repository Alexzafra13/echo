import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, StreamableFile } from '@nestjs/common';
import { ImagesController } from './images.controller';
import { ImageService, ArtistImageType } from '../application/services/image.service';
import { getLoggerToken } from 'nestjs-pino';
import { FastifyReply } from 'fastify';
import { Readable } from 'stream';

// Mock fs module
jest.mock('fs', () => ({
  createReadStream: jest.fn(() => {
    const readable = new Readable();
    readable._read = () => {};
    readable.push(Buffer.from('mock-image-data'));
    readable.push(null);
    return readable;
  }),
}));

describe('ImagesController', () => {
  let controller: ImagesController;
  let imageService: jest.Mocked<ImageService>;

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockImageResult = {
    filePath: '/app/data/metadata/artists/artist-1/profile.jpg',
    size: 50000,
    mimeType: 'image/jpeg',
    lastModified: new Date('2024-01-01'),
    tag: 'abc123',
    source: 'external' as const,
  };

  const createMockReply = (): FastifyReply => {
    const reply = {
      status: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    return reply as unknown as FastifyReply;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImagesController],
      providers: [
        {
          provide: getLoggerToken(ImagesController.name),
          useValue: mockLogger,
        },
        {
          provide: ImageService,
          useValue: {
            getArtistImage: jest.fn(),
            getAlbumCover: jest.fn(),
            getCustomAlbumCover: jest.fn(),
            getCustomArtistImage: jest.fn(),
            hasArtistImage: jest.fn(),
            hasAlbumCover: jest.fn(),
            getUserAvatar: jest.fn(),
            getArtistImages: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ImagesController>(ImagesController);
    imageService = module.get(ImageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Artist image endpoints
  // ============================================

  describe('getArtistImage', () => {
    it('should return artist image as StreamableFile', async () => {
      imageService.getArtistImage.mockResolvedValue(mockImageResult);

      const reply = createMockReply();

      const result = await controller.getArtistImage(
        'artist-1',
        'profile',
        undefined,
        undefined,
        reply
      );

      expect(result).toBeInstanceOf(StreamableFile);
      expect(reply.header).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(reply.header).toHaveBeenCalledWith('ETag', '"abc123"');
      expect(reply.header).toHaveBeenCalledWith(
        'Cache-Control',
        'public, max-age=31536000, immutable'
      );
    });

    it('should return 304 Not Modified when ETag matches', async () => {
      imageService.getArtistImage.mockResolvedValue(mockImageResult);

      const reply = createMockReply();

      const result = await controller.getArtistImage(
        'artist-1',
        'profile',
        undefined,
        '"abc123"', // If-None-Match header
        reply
      );

      expect(result).toBeUndefined();
      expect(reply.status).toHaveBeenCalledWith(304);
    });

    it('should throw NotFoundException for invalid image type', async () => {
      const reply = createMockReply();

      await expect(
        controller.getArtistImage('artist-1', 'invalid', undefined, undefined, reply)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when image not found', async () => {
      imageService.getArtistImage.mockRejectedValue(new NotFoundException('Image not found'));

      const reply = createMockReply();

      await expect(
        controller.getArtistImage('artist-1', 'profile', undefined, undefined, reply)
      ).rejects.toThrow(NotFoundException);
    });

    it('should accept all valid image types', async () => {
      imageService.getArtistImage.mockResolvedValue(mockImageResult);
      const reply = createMockReply();

      const validTypes: ArtistImageType[] = ['profile', 'background', 'banner', 'logo'];

      for (const imageType of validTypes) {
        const result = await controller.getArtistImage(
          'artist-1',
          imageType,
          undefined,
          undefined,
          reply
        );
        expect(result).toBeInstanceOf(StreamableFile);
      }

      expect(imageService.getArtistImage).toHaveBeenCalledTimes(4);
    });
  });

  describe('checkArtistImage', () => {
    it('should return exists: true when image exists', async () => {
      imageService.hasArtistImage.mockResolvedValue(true);

      const result = await controller.checkArtistImage('artist-1', 'profile');

      expect(result).toEqual({
        exists: true,
        artistId: 'artist-1',
        imageType: 'profile',
      });
    });

    it('should return exists: false when image does not exist', async () => {
      imageService.hasArtistImage.mockResolvedValue(false);

      const result = await controller.checkArtistImage('artist-1', 'background');

      expect(result).toEqual({
        exists: false,
        artistId: 'artist-1',
        imageType: 'background',
      });
    });

    it('should return error for invalid image type', async () => {
      const result = await controller.checkArtistImage('artist-1', 'invalid');

      expect(result).toEqual({
        exists: false,
        artistId: 'artist-1',
        imageType: 'invalid',
        error: 'Invalid image type',
      });
      expect(imageService.hasArtistImage).not.toHaveBeenCalled();
    });
  });

  describe('getArtistImages', () => {
    it('should return all available artist images', async () => {
      imageService.getArtistImages.mockResolvedValue({
        profile: mockImageResult,
        background: { ...mockImageResult, tag: 'bg123' },
        banner: null,
        logo: null,
      });

      const result = await controller.getArtistImages('artist-1');

      expect(result.artistId).toBe('artist-1');
      expect(result.images.profile?.exists).toBe(true);
      expect(result.images.profile?.tag).toBe('abc123');
      expect(result.images.background?.exists).toBe(true);
      expect(result.images.banner).toBeUndefined();
      expect(result.images.logo).toBeUndefined();
    });

    it('should return empty images when no images exist', async () => {
      imageService.getArtistImages.mockResolvedValue({
        profile: null,
        background: null,
        banner: null,
        logo: null,
      });

      const result = await controller.getArtistImages('artist-1');

      expect(result.artistId).toBe('artist-1');
      expect(result.images).toEqual({});
    });
  });

  describe('getCustomArtistImage', () => {
    it('should return custom artist image as StreamableFile', async () => {
      imageService.getCustomArtistImage.mockResolvedValue(mockImageResult);

      const reply = createMockReply();

      const result = await controller.getCustomArtistImage('artist-1', 'custom-1', reply);

      expect(result).toBeInstanceOf(StreamableFile);
      expect(imageService.getCustomArtistImage).toHaveBeenCalledWith('artist-1', 'custom-1');
    });

    it('should throw NotFoundException when custom image not found', async () => {
      imageService.getCustomArtistImage.mockRejectedValue(
        new NotFoundException('Custom image not found')
      );

      const reply = createMockReply();

      await expect(
        controller.getCustomArtistImage('artist-1', 'non-existent', reply)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // Album cover endpoints
  // ============================================

  describe('getAlbumCover', () => {
    it('should return album cover as StreamableFile', async () => {
      const coverResult = { ...mockImageResult, filePath: '/app/data/albums/album-1/cover.jpg' };
      imageService.getAlbumCover.mockResolvedValue(coverResult);

      const reply = createMockReply();

      const result = await controller.getAlbumCover('album-1', undefined, undefined, reply);

      expect(result).toBeInstanceOf(StreamableFile);
      expect(reply.header).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(imageService.getAlbumCover).toHaveBeenCalledWith('album-1');
    });

    it('should return 304 Not Modified when ETag matches', async () => {
      imageService.getAlbumCover.mockResolvedValue(mockImageResult);

      const reply = createMockReply();

      const result = await controller.getAlbumCover('album-1', undefined, '"abc123"', reply);

      expect(result).toBeUndefined();
      expect(reply.status).toHaveBeenCalledWith(304);
    });

    it('should throw NotFoundException when cover not found', async () => {
      imageService.getAlbumCover.mockRejectedValue(new NotFoundException('Cover not found'));

      const reply = createMockReply();

      await expect(
        controller.getAlbumCover('non-existent', undefined, undefined, reply)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkAlbumCover', () => {
    it('should return exists: true when cover exists', async () => {
      imageService.hasAlbumCover.mockResolvedValue(true);

      const result = await controller.checkAlbumCover('album-1');

      expect(result).toEqual({
        exists: true,
        albumId: 'album-1',
      });
    });

    it('should return exists: false when cover does not exist', async () => {
      imageService.hasAlbumCover.mockResolvedValue(false);

      const result = await controller.checkAlbumCover('album-1');

      expect(result).toEqual({
        exists: false,
        albumId: 'album-1',
      });
    });
  });

  describe('getAlbumCoverMetadata', () => {
    it('should return cover metadata when cover exists', async () => {
      imageService.getAlbumCover.mockResolvedValue(mockImageResult);

      const result = await controller.getAlbumCoverMetadata('album-1');

      expect(result.albumId).toBe('album-1');
      expect(result.cover.exists).toBe(true);
      expect(result.cover.size).toBe(50000);
      expect(result.cover.mimeType).toBe('image/jpeg');
      expect(result.cover.tag).toBe('abc123');
    });

    it('should return exists: false when cover not found', async () => {
      imageService.getAlbumCover.mockRejectedValue(new NotFoundException('Cover not found'));

      const result = await controller.getAlbumCoverMetadata('album-1');

      expect(result.albumId).toBe('album-1');
      expect(result.cover.exists).toBe(false);
    });
  });

  describe('getCustomAlbumCover', () => {
    it('should return custom album cover as StreamableFile', async () => {
      imageService.getCustomAlbumCover.mockResolvedValue(mockImageResult);

      const reply = createMockReply();

      const result = await controller.getCustomAlbumCover('album-1', 'custom-1', reply);

      expect(result).toBeInstanceOf(StreamableFile);
      expect(imageService.getCustomAlbumCover).toHaveBeenCalledWith('album-1', 'custom-1');
    });

    it('should throw NotFoundException when custom cover not found', async () => {
      imageService.getCustomAlbumCover.mockRejectedValue(
        new NotFoundException('Custom cover not found')
      );

      const reply = createMockReply();

      await expect(
        controller.getCustomAlbumCover('album-1', 'non-existent', reply)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // User avatar endpoints
  // ============================================

  describe('getUserAvatar', () => {
    it('should return user avatar as StreamableFile', async () => {
      const avatarResult = { ...mockImageResult, filePath: '/app/data/users/user-1/avatar.jpg' };
      imageService.getUserAvatar.mockResolvedValue(avatarResult);

      const reply = createMockReply();

      const result = await controller.getUserAvatar('user-1', reply);

      expect(result).toBeInstanceOf(StreamableFile);
      expect(reply.header).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(imageService.getUserAvatar).toHaveBeenCalledWith('user-1');
    });

    it('should throw NotFoundException when avatar not found', async () => {
      imageService.getUserAvatar.mockRejectedValue(new NotFoundException('Avatar not found'));

      const reply = createMockReply();

      await expect(controller.getUserAvatar('non-existent', reply)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ============================================
  // Cache headers
  // ============================================

  describe('cache headers', () => {
    it('should set all required cache headers', async () => {
      imageService.getArtistImage.mockResolvedValue(mockImageResult);

      const reply = createMockReply();

      await controller.getArtistImage('artist-1', 'profile', undefined, undefined, reply);

      expect(reply.header).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(reply.header).toHaveBeenCalledWith(
        'Last-Modified',
        mockImageResult.lastModified.toUTCString()
      );
      expect(reply.header).toHaveBeenCalledWith('ETag', '"abc123"');
      expect(reply.header).toHaveBeenCalledWith(
        'Cache-Control',
        'public, max-age=31536000, immutable'
      );
      expect(reply.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(reply.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, HEAD, OPTIONS'
      );
    });
  });
});
