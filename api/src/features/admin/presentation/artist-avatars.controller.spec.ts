import { Test, TestingModule } from '@nestjs/testing';
import { ArtistAvatarsController } from './artist-avatars.controller';
import { SearchArtistAvatarsUseCase } from '../infrastructure/use-cases/search-artist-avatars';
import { ApplyArtistAvatarUseCase } from '../infrastructure/use-cases/apply-artist-avatar';
import { UpdateArtistBackgroundPositionUseCase } from '../infrastructure/use-cases/update-artist-background-position';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { MockUseCase, createMockUseCase } from '@shared/testing/mock.types';

describe('ArtistAvatarsController', () => {
  let controller: ArtistAvatarsController;
  let mockSearchArtistAvatars: MockUseCase;
  let mockApplyArtistAvatar: MockUseCase;
  let mockUpdateArtistBackgroundPosition: MockUseCase;

  beforeEach(async () => {
    mockSearchArtistAvatars = createMockUseCase();
    mockApplyArtistAvatar = createMockUseCase();
    mockUpdateArtistBackgroundPosition = createMockUseCase();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArtistAvatarsController],
      providers: [
        {
          provide: SearchArtistAvatarsUseCase,
          useValue: mockSearchArtistAvatars,
        },
        {
          provide: ApplyArtistAvatarUseCase,
          useValue: mockApplyArtistAvatar,
        },
        {
          provide: UpdateArtistBackgroundPositionUseCase,
          useValue: mockUpdateArtistBackgroundPosition,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ArtistAvatarsController>(ArtistAvatarsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('searchAvatars', () => {
    it('should call searchArtistAvatars.execute with the correct artistId', async () => {
      const artistId = '550e8400-e29b-41d4-a716-446655440000';
      const mockResult = {
        avatars: [
          {
            provider: 'fanart',
            url: 'https://example.com/avatar.jpg',
            thumbnailUrl: 'https://example.com/avatar-thumb.jpg',
            width: 1000,
            height: 1000,
            type: 'profile',
          },
        ],
        artistInfo: {
          id: artistId,
          name: 'Test Artist',
          mbzArtistId: 'mbz-artist-123',
        },
      };

      mockSearchArtistAvatars.execute.mockResolvedValue(mockResult);

      const result = await controller.searchAvatars(artistId);

      expect(mockSearchArtistAvatars.execute).toHaveBeenCalledWith({ artistId });
      expect(result).toBeDefined();
      expect(result.avatars).toHaveLength(1);
      expect(result.artistInfo.id).toBe(artistId);
    });

    it('should propagate errors from the use case', async () => {
      const artistId = '550e8400-e29b-41d4-a716-446655440000';
      mockSearchArtistAvatars.execute.mockRejectedValue(
        new Error('Artist not found'),
      );

      await expect(controller.searchAvatars(artistId)).rejects.toThrow(
        'Artist not found',
      );
    });
  });

  describe('applyAvatar', () => {
    it('should call applyArtistAvatar.execute with correct parameters', async () => {
      const body = {
        artistId: '550e8400-e29b-41d4-a716-446655440000',
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'fanart',
        type: 'profile',
      };
      const mockResult = {
        success: true,
        message: 'Avatar applied successfully',
        imagePath: '/data/artists/avatar.jpg',
      };

      mockApplyArtistAvatar.execute.mockResolvedValue(mockResult);

      const result = await controller.applyAvatar(body);

      expect(mockApplyArtistAvatar.execute).toHaveBeenCalledWith({
        artistId: body.artistId,
        avatarUrl: body.avatarUrl,
        provider: body.provider,
        type: body.type,
      });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should propagate errors from the use case', async () => {
      const body = {
        artistId: '550e8400-e29b-41d4-a716-446655440000',
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'fanart',
        type: 'profile',
      };
      mockApplyArtistAvatar.execute.mockRejectedValue(
        new Error('Failed to apply avatar'),
      );

      await expect(controller.applyAvatar(body)).rejects.toThrow(
        'Failed to apply avatar',
      );
    });
  });

  describe('updateBackgroundPosition', () => {
    it('should call updateArtistBackgroundPosition.execute with correct parameters', async () => {
      const body = {
        artistId: '550e8400-e29b-41d4-a716-446655440000',
        backgroundPosition: 'center 30%',
      };
      const mockResult = {
        success: true,
        message: 'Background position updated successfully',
      };

      mockUpdateArtistBackgroundPosition.execute.mockResolvedValue(mockResult);

      const result = await controller.updateBackgroundPosition(body);

      expect(mockUpdateArtistBackgroundPosition.execute).toHaveBeenCalledWith({
        artistId: body.artistId,
        backgroundPosition: body.backgroundPosition,
      });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should propagate errors from the use case', async () => {
      const body = {
        artistId: '550e8400-e29b-41d4-a716-446655440000',
        backgroundPosition: 'center 30%',
      };
      mockUpdateArtistBackgroundPosition.execute.mockRejectedValue(
        new Error('Artist not found'),
      );

      await expect(controller.updateBackgroundPosition(body)).rejects.toThrow(
        'Artist not found',
      );
    });
  });
});
