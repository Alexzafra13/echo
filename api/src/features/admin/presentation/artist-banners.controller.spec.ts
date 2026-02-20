import { Test, TestingModule } from '@nestjs/testing';
import { ArtistBannersManagementController } from './artist-banners.controller';
import { ManageArtistBannersUseCase } from '../infrastructure/use-cases/manage-artist-banners';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';

describe('ArtistBannersManagementController', () => {
  let controller: ArtistBannersManagementController;
  let mockManageBanners: {
    list: jest.Mock;
    add: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockManageBanners = {
      list: jest.fn(),
      add: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArtistBannersManagementController],
      providers: [
        {
          provide: ManageArtistBannersUseCase,
          useValue: mockManageBanners,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ArtistBannersManagementController>(
      ArtistBannersManagementController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listBanners', () => {
    it('should call manageBanners.list with the correct artistId', async () => {
      const artistId = '550e8400-e29b-41d4-a716-446655440000';
      const mockResult = {
        banners: [
          {
            id: 'banner-1',
            artistId,
            imageUrl: '/data/artists/banner-1.png',
            provider: 'fanart',
            order: 0,
            createdAt: new Date(),
          },
        ],
      };

      mockManageBanners.list.mockResolvedValue(mockResult);

      const result = await controller.listBanners(artistId);

      expect(mockManageBanners.list).toHaveBeenCalledWith({ artistId });
      expect(result).toBeDefined();
      expect(result.banners).toHaveLength(1);
    });

    it('should propagate errors from the use case', async () => {
      const artistId = '550e8400-e29b-41d4-a716-446655440000';
      mockManageBanners.list.mockRejectedValue(
        new Error('Artist not found'),
      );

      await expect(controller.listBanners(artistId)).rejects.toThrow(
        'Artist not found',
      );
    });
  });

  describe('addBanner', () => {
    it('should call manageBanners.add with the correct body', async () => {
      const body = {
        artistId: '550e8400-e29b-41d4-a716-446655440000',
        bannerUrl: 'https://example.com/banner.jpg',
        provider: 'fanart',
      };
      const mockResult = {
        success: true,
        message: 'Banner added successfully',
        bannerId: 'banner-new',
      };

      mockManageBanners.add.mockResolvedValue(mockResult);

      const result = await controller.addBanner(body);

      expect(mockManageBanners.add).toHaveBeenCalledWith(body);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.bannerId).toBe('banner-new');
    });

    it('should propagate errors from the use case', async () => {
      const body = {
        artistId: '550e8400-e29b-41d4-a716-446655440000',
        bannerUrl: 'https://example.com/banner.jpg',
        provider: 'fanart',
      };
      mockManageBanners.add.mockRejectedValue(
        new Error('Failed to add banner'),
      );

      await expect(controller.addBanner(body)).rejects.toThrow(
        'Failed to add banner',
      );
    });
  });

  describe('deleteBanner', () => {
    it('should call manageBanners.delete with the correct bannerId', async () => {
      const bannerId = '550e8400-e29b-41d4-a716-446655440001';
      const mockResult = {
        success: true,
        message: 'Banner deleted successfully',
      };

      mockManageBanners.delete.mockResolvedValue(mockResult);

      const result = await controller.deleteBanner(bannerId);

      expect(mockManageBanners.delete).toHaveBeenCalledWith({ bannerId });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should propagate errors from the use case', async () => {
      const bannerId = '550e8400-e29b-41d4-a716-446655440001';
      mockManageBanners.delete.mockRejectedValue(
        new Error('Banner not found'),
      );

      await expect(controller.deleteBanner(bannerId)).rejects.toThrow(
        'Banner not found',
      );
    });
  });
});
