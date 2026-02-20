import { Test, TestingModule } from '@nestjs/testing';
import { AlbumCoversController } from './album-covers.controller';
import { SearchAlbumCoversUseCase } from '../infrastructure/use-cases/search-album-covers';
import { ApplyAlbumCoverUseCase } from '../infrastructure/use-cases/apply-album-cover';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { MockUseCase, createMockUseCase } from '@shared/testing/mock.types';

describe('AlbumCoversController', () => {
  let controller: AlbumCoversController;
  let mockSearchAlbumCovers: MockUseCase;
  let mockApplyAlbumCover: MockUseCase;

  beforeEach(async () => {
    mockSearchAlbumCovers = createMockUseCase();
    mockApplyAlbumCover = createMockUseCase();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlbumCoversController],
      providers: [
        {
          provide: SearchAlbumCoversUseCase,
          useValue: mockSearchAlbumCovers,
        },
        {
          provide: ApplyAlbumCoverUseCase,
          useValue: mockApplyAlbumCover,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AlbumCoversController>(AlbumCoversController);
  });

  describe('searchCovers', () => {
    it('should call searchAlbumCovers.execute with the correct albumId', async () => {
      const albumId = '550e8400-e29b-41d4-a716-446655440000';
      const mockResult = {
        covers: [
          {
            provider: 'musicbrainz',
            url: 'https://example.com/cover.jpg',
            thumbnailUrl: 'https://example.com/cover-thumb.jpg',
            width: 500,
            height: 500,
            size: 'large',
          },
        ],
        albumInfo: {
          id: albumId,
          name: 'Test Album',
          artistName: 'Test Artist',
          mbzAlbumId: 'mbz-123',
        },
      };

      mockSearchAlbumCovers.execute.mockResolvedValue(mockResult);

      const result = await controller.searchCovers(albumId);

      expect(mockSearchAlbumCovers.execute).toHaveBeenCalledWith({ albumId });
      expect(result).toBeDefined();
      expect(result.covers).toHaveLength(1);
      expect(result.albumInfo.id).toBe(albumId);
    });

    it('should propagate errors from the use case', async () => {
      const albumId = '550e8400-e29b-41d4-a716-446655440000';
      mockSearchAlbumCovers.execute.mockRejectedValue(
        new Error('Album not found'),
      );

      await expect(controller.searchCovers(albumId)).rejects.toThrow(
        'Album not found',
      );
    });
  });

  describe('applyCover', () => {
    it('should call applyAlbumCover.execute with correct parameters', async () => {
      const body = {
        albumId: '550e8400-e29b-41d4-a716-446655440000',
        coverUrl: 'https://example.com/cover.jpg',
        provider: 'musicbrainz',
      };
      const mockResult = {
        success: true,
        message: 'Cover applied successfully',
        coverPath: '/data/albums/cover.jpg',
      };

      mockApplyAlbumCover.execute.mockResolvedValue(mockResult);

      const result = await controller.applyCover(body);

      expect(mockApplyAlbumCover.execute).toHaveBeenCalledWith({
        albumId: body.albumId,
        coverUrl: body.coverUrl,
        provider: body.provider,
      });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should propagate errors from the use case', async () => {
      const body = {
        albumId: '550e8400-e29b-41d4-a716-446655440000',
        coverUrl: 'https://example.com/cover.jpg',
        provider: 'musicbrainz',
      };
      mockApplyAlbumCover.execute.mockRejectedValue(
        new Error('Failed to apply cover'),
      );

      await expect(controller.applyCover(body)).rejects.toThrow(
        'Failed to apply cover',
      );
    });
  });
});
