import { Test, TestingModule } from '@nestjs/testing';
import { CustomArtistImagesController } from './custom-artist-images.controller';
import { UploadCustomArtistImageUseCase } from '../infrastructure/use-cases/upload-custom-artist-image';
import { ListCustomArtistImagesUseCase } from '../infrastructure/use-cases/list-custom-artist-images';
import { DeleteCustomArtistImageUseCase } from '../infrastructure/use-cases/delete-custom-artist-image';
import { ApplyCustomArtistImageUseCase } from '../infrastructure/use-cases/apply-custom-artist-image';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { CanActivate } from '@nestjs/common';

describe('CustomArtistImagesController', () => {
  let controller: CustomArtistImagesController;
  let uploadCustomImage: jest.Mocked<UploadCustomArtistImageUseCase>;
  let listCustomImages: jest.Mocked<ListCustomArtistImagesUseCase>;
  let deleteCustomImage: jest.Mocked<DeleteCustomArtistImageUseCase>;
  let applyCustomImage: jest.Mocked<ApplyCustomArtistImageUseCase>;

  const mockGuard: CanActivate = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const mockUploadCustomImage = {
      execute: jest.fn(),
    };

    const mockListCustomImages = {
      execute: jest.fn(),
    };

    const mockDeleteCustomImage = {
      execute: jest.fn(),
    };

    const mockApplyCustomImage = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomArtistImagesController],
      providers: [
        {
          provide: UploadCustomArtistImageUseCase,
          useValue: mockUploadCustomImage,
        },
        {
          provide: ListCustomArtistImagesUseCase,
          useValue: mockListCustomImages,
        },
        {
          provide: DeleteCustomArtistImageUseCase,
          useValue: mockDeleteCustomImage,
        },
        {
          provide: ApplyCustomArtistImageUseCase,
          useValue: mockApplyCustomImage,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(AdminGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<CustomArtistImagesController>(CustomArtistImagesController);
    uploadCustomImage = module.get(UploadCustomArtistImageUseCase);
    listCustomImages = module.get(ListCustomArtistImagesUseCase);
    deleteCustomImage = module.get(DeleteCustomArtistImageUseCase);
    applyCustomImage = module.get(ApplyCustomArtistImageUseCase);
  });

  describe('listImages', () => {
    it('should call listCustomImages.execute with artistId', async () => {
      const artistId = 'artist-123';
      const mockResult = [
        {
          id: 'image-1',
          artistId: 'artist-123',
          url: 'https://example.com/image1.jpg',
          isActive: true,
        },
        {
          id: 'image-2',
          artistId: 'artist-123',
          url: 'https://example.com/image2.jpg',
          isActive: false,
        },
      ];

      listCustomImages.execute.mockResolvedValue(mockResult);

      const result = await controller.listImages(artistId);

      expect(listCustomImages.execute).toHaveBeenCalledWith({ artistId });
      expect(listCustomImages.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResult);
    });

    it('should return empty array when no images exist', async () => {
      const artistId = 'artist-456';
      listCustomImages.execute.mockResolvedValue([]);

      const result = await controller.listImages(artistId);

      expect(listCustomImages.execute).toHaveBeenCalledWith({ artistId });
      expect(result).toEqual([]);
    });
  });

  describe('applyImage', () => {
    it('should call applyCustomImage.execute with artistId and customImageId', async () => {
      const artistId = 'artist-123';
      const customImageId = 'image-456';
      const mockResult = {
        id: 'image-456',
        artistId: 'artist-123',
        url: 'https://example.com/image.jpg',
        isActive: true,
      };

      applyCustomImage.execute.mockResolvedValue(mockResult);

      const result = await controller.applyImage(artistId, customImageId);

      expect(applyCustomImage.execute).toHaveBeenCalledWith({
        artistId,
        customImageId,
      });
      expect(applyCustomImage.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResult);
    });

    it('should handle apply image with different IDs', async () => {
      const artistId = 'artist-789';
      const customImageId = 'image-012';
      const mockResult = {
        id: 'image-012',
        artistId: 'artist-789',
        url: 'https://example.com/new-image.jpg',
        isActive: true,
      };

      applyCustomImage.execute.mockResolvedValue(mockResult);

      const result = await controller.applyImage(artistId, customImageId);

      expect(applyCustomImage.execute).toHaveBeenCalledWith({
        artistId,
        customImageId,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('deleteImage', () => {
    it('should call deleteCustomImage.execute with artistId and customImageId', async () => {
      const artistId = 'artist-123';
      const customImageId = 'image-456';

      deleteCustomImage.execute.mockResolvedValue(undefined);

      await controller.deleteImage(artistId, customImageId);

      expect(deleteCustomImage.execute).toHaveBeenCalledWith({
        artistId,
        customImageId,
      });
      expect(deleteCustomImage.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle delete image with different IDs', async () => {
      const artistId = 'artist-999';
      const customImageId = 'image-888';

      deleteCustomImage.execute.mockResolvedValue(undefined);

      await controller.deleteImage(artistId, customImageId);

      expect(deleteCustomImage.execute).toHaveBeenCalledWith({
        artistId,
        customImageId,
      });
    });

    it('should complete successfully when image is deleted', async () => {
      const artistId = 'artist-111';
      const customImageId = 'image-222';

      deleteCustomImage.execute.mockResolvedValue(undefined);

      const result = await controller.deleteImage(artistId, customImageId);

      expect(deleteCustomImage.execute).toHaveBeenCalledWith({
        artistId,
        customImageId,
      });
      expect(result).toBeUndefined();
    });
  });
});
