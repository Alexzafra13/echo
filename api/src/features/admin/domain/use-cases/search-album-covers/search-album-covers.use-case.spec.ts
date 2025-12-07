import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SearchAlbumCoversUseCase } from './search-album-covers.use-case';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { ImageSearchOrchestratorService } from '@features/external-metadata/application/services';

describe('SearchAlbumCoversUseCase', () => {
  let useCase: SearchAlbumCoversUseCase;
  let mockDrizzle: any;
  let mockOrchestrator: jest.Mocked<ImageSearchOrchestratorService>;

  const mockAlbum = {
    id: 'album-123',
    name: 'Test Album',
    artistId: 'artist-456',
    mbzAlbumId: 'mbz-album-789',
  };

  const mockArtist = {
    id: 'artist-456',
    name: 'Test Artist',
    mbzArtistId: 'mbz-artist-111',
  };

  const mockCovers = [
    {
      provider: 'coverart',
      url: 'https://coverartarchive.org/large.jpg',
      thumbnailUrl: 'https://coverartarchive.org/small.jpg',
      width: 1200,
      height: 1200,
      size: '1200x1200 (large)',
    },
    {
      provider: 'fanart',
      url: 'https://fanart.tv/cover.jpg',
      thumbnailUrl: undefined,
      width: 1000,
      height: 1000,
      size: '1000x1000',
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup mock DB chain with join support
    const mockSelect = jest.fn().mockReturnThis();
    const mockFrom = jest.fn().mockReturnThis();
    const mockLeftJoin = jest.fn().mockReturnThis();
    const mockWhere = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockResolvedValue([{
      album: mockAlbum,
      artist: mockArtist,
    }]);

    mockDrizzle = {
      db: {
        select: mockSelect,
        from: mockFrom,
        leftJoin: mockLeftJoin,
        where: mockWhere,
        limit: mockLimit,
      },
    };

    mockOrchestrator = {
      searchAlbumCovers: jest.fn().mockResolvedValue(mockCovers),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchAlbumCoversUseCase,
        { provide: DrizzleService, useValue: mockDrizzle },
        { provide: ImageSearchOrchestratorService, useValue: mockOrchestrator },
      ],
    }).compile();

    useCase = module.get<SearchAlbumCoversUseCase>(SearchAlbumCoversUseCase);
  });

  describe('execute', () => {
    const input = { albumId: 'album-123' };

    it('should return covers from all providers', async () => {
      const result = await useCase.execute(input);

      expect(result.covers).toHaveLength(2);
      expect(result.covers[0].provider).toBe('coverart');
      expect(result.covers[1].provider).toBe('fanart');
    });

    it('should return album info with artist name', async () => {
      const result = await useCase.execute(input);

      expect(result.albumInfo).toEqual({
        id: 'album-123',
        name: 'Test Album',
        artistName: 'Test Artist',
        mbzAlbumId: 'mbz-album-789',
      });
    });

    it('should pass correct params to orchestrator', async () => {
      await useCase.execute(input);

      expect(mockOrchestrator.searchAlbumCovers).toHaveBeenCalledWith({
        albumName: 'Test Album',
        artistName: 'Test Artist',
        mbzAlbumId: 'mbz-album-789',
        mbzArtistId: 'mbz-artist-111',
      });
    });

    it('should throw NotFoundException if album does not exist', async () => {
      mockDrizzle.db.limit.mockResolvedValue([]);

      await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow('Album not found');
    });

    it('should handle album without artist (orphan album)', async () => {
      mockDrizzle.db.limit.mockResolvedValue([{
        album: mockAlbum,
        artist: null,
      }]);

      const result = await useCase.execute(input);

      expect(mockOrchestrator.searchAlbumCovers).toHaveBeenCalledWith({
        albumName: 'Test Album',
        artistName: 'Unknown Artist',
        mbzAlbumId: 'mbz-album-789',
        mbzArtistId: null,
      });
      expect(result.albumInfo.artistName).toBe('Unknown Artist');
    });

    it('should handle album without mbzAlbumId', async () => {
      mockDrizzle.db.limit.mockResolvedValue([{
        album: { ...mockAlbum, mbzAlbumId: null },
        artist: mockArtist,
      }]);

      const result = await useCase.execute(input);

      expect(mockOrchestrator.searchAlbumCovers).toHaveBeenCalledWith(
        expect.objectContaining({
          mbzAlbumId: null,
        }),
      );
      expect(result.albumInfo.mbzAlbumId).toBeUndefined();
    });

    it('should return empty covers array if no images found', async () => {
      mockOrchestrator.searchAlbumCovers.mockResolvedValue([]);

      const result = await useCase.execute(input);

      expect(result.covers).toEqual([]);
    });

    it('should map all cover properties correctly', async () => {
      const result = await useCase.execute(input);

      const firstCover = result.covers[0];
      expect(firstCover).toEqual({
        provider: 'coverart',
        url: 'https://coverartarchive.org/large.jpg',
        thumbnailUrl: 'https://coverartarchive.org/small.jpg',
        width: 1200,
        height: 1200,
        size: '1200x1200 (large)',
      });
    });

    it('should handle covers without thumbnailUrl', async () => {
      const result = await useCase.execute(input);

      const fanartCover = result.covers.find((c) => c.provider === 'fanart');
      expect(fanartCover?.thumbnailUrl).toBeUndefined();
    });
  });
});
