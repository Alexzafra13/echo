import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SearchArtistAvatarsUseCase } from './search-artist-avatars.use-case';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { ImageSearchOrchestratorService } from '@features/external-metadata/application/services';

describe('SearchArtistAvatarsUseCase', () => {
  let useCase: SearchArtistAvatarsUseCase;
  let mockDrizzle: {
    db: {
      select: jest.Mock;
      from: jest.Mock;
      where: jest.Mock;
      limit: jest.Mock;
    };
  };
  let mockOrchestrator: jest.Mocked<ImageSearchOrchestratorService>;

  const mockArtist = {
    id: 'artist-123',
    name: 'Test Artist',
    mbzArtistId: 'mbz-456',
  };

  const mockImages = [
    {
      provider: 'fanart',
      url: 'https://fanart.tv/image1.jpg',
      thumbnailUrl: 'https://fanart.tv/thumb1.jpg',
      width: 1000,
      height: 1000,
      type: 'profile' as const,
    },
    {
      provider: 'lastfm',
      url: 'https://lastfm.com/image2.jpg',
      thumbnailUrl: undefined,
      width: 300,
      height: 300,
      type: 'profile' as const,
    },
    {
      provider: 'fanart',
      url: 'https://fanart.tv/bg.jpg',
      thumbnailUrl: undefined,
      width: 1920,
      height: 1080,
      type: 'background' as const,
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup mock DB chain
    const mockSelect = jest.fn().mockReturnThis();
    const mockFrom = jest.fn().mockReturnThis();
    const mockWhere = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockResolvedValue([mockArtist]);

    mockDrizzle = {
      db: {
        select: mockSelect,
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      },
    };

    mockOrchestrator = {
      searchArtistImages: jest.fn().mockResolvedValue(mockImages),
    } as unknown as jest.Mocked<ImageSearchOrchestratorService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchArtistAvatarsUseCase,
        { provide: DrizzleService, useValue: mockDrizzle },
        { provide: ImageSearchOrchestratorService, useValue: mockOrchestrator },
      ],
    }).compile();

    useCase = module.get<SearchArtistAvatarsUseCase>(SearchArtistAvatarsUseCase);
  });

  describe('execute', () => {
    const input = { artistId: 'artist-123' };

    it('should return avatars from all providers', async () => {
      const result = await useCase.execute(input);

      expect(result.avatars).toHaveLength(3);
      expect(result.avatars[0].provider).toBe('fanart');
      expect(result.avatars[1].provider).toBe('lastfm');
    });

    it('should return artist info', async () => {
      const result = await useCase.execute(input);

      expect(result.artistInfo).toEqual({
        id: 'artist-123',
        name: 'Test Artist',
        mbzArtistId: 'mbz-456',
      });
    });

    it('should pass correct params to orchestrator', async () => {
      await useCase.execute(input);

      expect(mockOrchestrator.searchArtistImages).toHaveBeenCalledWith({
        artistName: 'Test Artist',
        mbzArtistId: 'mbz-456',
      });
    });

    it('should throw NotFoundException if artist does not exist', async () => {
      mockDrizzle.db.limit.mockResolvedValue([]);

      await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow('Artist not found');
    });

    it('should handle artist without mbzArtistId', async () => {
      mockDrizzle.db.limit.mockResolvedValue([
        {
          ...mockArtist,
          mbzArtistId: null,
        },
      ]);

      const result = await useCase.execute(input);

      expect(mockOrchestrator.searchArtistImages).toHaveBeenCalledWith({
        artistName: 'Test Artist',
        mbzArtistId: null,
      });
      expect(result.artistInfo.mbzArtistId).toBeUndefined();
    });

    it('should return empty avatars array if no images found', async () => {
      mockOrchestrator.searchArtistImages.mockResolvedValue([]);

      const result = await useCase.execute(input);

      expect(result.avatars).toEqual([]);
    });

    it('should map all image properties correctly', async () => {
      const result = await useCase.execute(input);

      const firstAvatar = result.avatars[0];
      expect(firstAvatar).toEqual({
        provider: 'fanart',
        url: 'https://fanart.tv/image1.jpg',
        thumbnailUrl: 'https://fanart.tv/thumb1.jpg',
        width: 1000,
        height: 1000,
        type: 'profile',
      });
    });

    it('should include different image types (profile, background)', async () => {
      const result = await useCase.execute(input);

      const types = result.avatars.map((a) => a.type);
      expect(types).toContain('profile');
      expect(types).toContain('background');
    });
  });
});
