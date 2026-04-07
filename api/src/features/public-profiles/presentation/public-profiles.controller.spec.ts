import { Test, TestingModule } from '@nestjs/testing';
import { PublicProfilesController } from './public-profiles.controller';
import { GetPublicProfileUseCase } from '../domain/use-cases/get-public-profile';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { MockUseCase, createMockUseCase } from '@shared/testing/mock.types';
import { JwtUser } from '@shared/types/request.types';

describe('PublicProfilesController', () => {
  let controller: PublicProfilesController;
  let mockGetPublicProfileUseCase: MockUseCase;

  const mockUser: Partial<JwtUser> = {
    id: 'user-1',
    username: 'testuser',
  };

  beforeEach(async () => {
    mockGetPublicProfileUseCase = createMockUseCase();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicProfilesController],
      providers: [
        {
          provide: GetPublicProfileUseCase,
          useValue: mockGetPublicProfileUseCase,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PublicProfilesController>(PublicProfilesController);
  });

  describe('getPublicProfile', () => {
    it('should call getPublicProfileUseCase.execute with correct parameters', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const mockResult = {
        user: {
          id: userId,
          username: 'profileuser',
          name: 'Profile User',
          hasAvatar: false,
          bio: 'A test bio',
          isPublicProfile: true,
          createdAt: new Date('2024-01-01'),
        },
        settings: {
          showTopTracks: true,
          showTopArtists: true,
          showTopAlbums: true,
          showPlaylists: true,
        },
        social: {
          friendshipStatus: 'none',
          stats: {
            totalPlays: 100,
            friendCount: 5,
          },
        },
      };

      mockGetPublicProfileUseCase.execute.mockResolvedValue(mockResult);

      const result = await controller.getPublicProfile(
        userId,
        mockUser as JwtUser,
      );

      expect(mockGetPublicProfileUseCase.execute).toHaveBeenCalledWith({
        userId,
        requesterId: mockUser.id,
      });
      expect(result).toBeDefined();
      expect(result.user.id).toBe(userId);
    });

    it('should propagate errors from the use case', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockGetPublicProfileUseCase.execute.mockRejectedValue(
        new Error('User not found'),
      );

      await expect(
        controller.getPublicProfile(userId, mockUser as JwtUser),
      ).rejects.toThrow('User not found');
    });
  });
});
