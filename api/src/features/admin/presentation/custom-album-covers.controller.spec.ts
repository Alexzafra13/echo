import { Test, TestingModule } from '@nestjs/testing';
import { CustomAlbumCoversController } from './custom-album-covers.controller';
import { UploadCustomAlbumCoverUseCase } from '../infrastructure/use-cases/upload-custom-album-cover';
import { ListCustomAlbumCoversUseCase } from '../infrastructure/use-cases/list-custom-album-covers';
import { DeleteCustomAlbumCoverUseCase } from '../infrastructure/use-cases/delete-custom-album-cover';
import { ApplyCustomAlbumCoverUseCase } from '../infrastructure/use-cases/apply-custom-album-cover';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { CanActivate } from '@nestjs/common';

describe('CustomAlbumCoversController', () => {
  let controller: CustomAlbumCoversController;
  let uploadCustomCover: jest.Mocked<UploadCustomAlbumCoverUseCase>;
  let listCustomCovers: jest.Mocked<ListCustomAlbumCoversUseCase>;
  let deleteCustomCover: jest.Mocked<DeleteCustomAlbumCoverUseCase>;
  let applyCustomCover: jest.Mocked<ApplyCustomAlbumCoverUseCase>;

  const mockGuard: CanActivate = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const mockUploadCustomCover = {
      execute: jest.fn(),
    };

    const mockListCustomCovers = {
      execute: jest.fn(),
    };

    const mockDeleteCustomCover = {
      execute: jest.fn(),
    };

    const mockApplyCustomCover = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomAlbumCoversController],
      providers: [
        {
          provide: UploadCustomAlbumCoverUseCase,
          useValue: mockUploadCustomCover,
        },
        {
          provide: ListCustomAlbumCoversUseCase,
          useValue: mockListCustomCovers,
        },
        {
          provide: DeleteCustomAlbumCoverUseCase,
          useValue: mockDeleteCustomCover,
        },
        {
          provide: ApplyCustomAlbumCoverUseCase,
          useValue: mockApplyCustomCover,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(AdminGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<CustomAlbumCoversController>(CustomAlbumCoversController);
    uploadCustomCover = module.get(UploadCustomAlbumCoverUseCase);
    listCustomCovers = module.get(ListCustomAlbumCoversUseCase);
    deleteCustomCover = module.get(DeleteCustomAlbumCoverUseCase);
    applyCustomCover = module.get(ApplyCustomAlbumCoverUseCase);
  });

  describe('listCovers', () => {
    it('should call listCustomCovers.execute with albumId', async () => {
      const albumId = 'album-123';
      const mockResult = [
        {
          id: 'cover-1',
          albumId: 'album-123',
          url: 'https://example.com/cover1.jpg',
          isActive: true,
        },
        {
          id: 'cover-2',
          albumId: 'album-123',
          url: 'https://example.com/cover2.jpg',
          isActive: false,
        },
      ];

      listCustomCovers.execute.mockResolvedValue(mockResult);

      const result = await controller.listCovers(albumId);

      expect(listCustomCovers.execute).toHaveBeenCalledWith({ albumId });
      expect(listCustomCovers.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResult);
    });

    it('should return empty array when no covers exist', async () => {
      const albumId = 'album-456';
      listCustomCovers.execute.mockResolvedValue([]);

      const result = await controller.listCovers(albumId);

      expect(listCustomCovers.execute).toHaveBeenCalledWith({ albumId });
      expect(result).toEqual([]);
    });
  });

  describe('applyCover', () => {
    it('should call applyCustomCover.execute with albumId and customCoverId', async () => {
      const albumId = 'album-123';
      const customCoverId = 'cover-456';
      const mockResult = {
        id: 'cover-456',
        albumId: 'album-123',
        url: 'https://example.com/cover.jpg',
        isActive: true,
      };

      applyCustomCover.execute.mockResolvedValue(mockResult);

      const result = await controller.applyCover(albumId, customCoverId);

      expect(applyCustomCover.execute).toHaveBeenCalledWith({
        albumId,
        customCoverId,
      });
      expect(applyCustomCover.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResult);
    });

    it('should handle apply cover with different IDs', async () => {
      const albumId = 'album-789';
      const customCoverId = 'cover-012';
      const mockResult = {
        id: 'cover-012',
        albumId: 'album-789',
        url: 'https://example.com/new-cover.jpg',
        isActive: true,
      };

      applyCustomCover.execute.mockResolvedValue(mockResult);

      const result = await controller.applyCover(albumId, customCoverId);

      expect(applyCustomCover.execute).toHaveBeenCalledWith({
        albumId,
        customCoverId,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('deleteCover', () => {
    it('should call deleteCustomCover.execute with albumId and customCoverId', async () => {
      const albumId = 'album-123';
      const customCoverId = 'cover-456';

      deleteCustomCover.execute.mockResolvedValue(undefined);

      await controller.deleteCover(albumId, customCoverId);

      expect(deleteCustomCover.execute).toHaveBeenCalledWith({
        albumId,
        customCoverId,
      });
      expect(deleteCustomCover.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle delete cover with different IDs', async () => {
      const albumId = 'album-999';
      const customCoverId = 'cover-888';

      deleteCustomCover.execute.mockResolvedValue(undefined);

      await controller.deleteCover(albumId, customCoverId);

      expect(deleteCustomCover.execute).toHaveBeenCalledWith({
        albumId,
        customCoverId,
      });
    });

    it('should complete successfully when cover is deleted', async () => {
      const albumId = 'album-111';
      const customCoverId = 'cover-222';

      deleteCustomCover.execute.mockResolvedValue(undefined);

      const result = await controller.deleteCover(albumId, customCoverId);

      expect(deleteCustomCover.execute).toHaveBeenCalledWith({
        albumId,
        customCoverId,
      });
      expect(result).toBeUndefined();
    });
  });
});
