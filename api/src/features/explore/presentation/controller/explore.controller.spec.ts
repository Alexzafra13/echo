import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { ExploreController } from './explore.controller';
import { ExploreService } from '../../infrastructure/services/explore.service';
import { RequestWithUser } from '@shared/types/request.types';
import {
  ExploreQueryDto,
  ForgottenAlbumsQueryDto,
  ExploreAlbumsResponseDto,
  ExploreTracksResponseDto,
  RandomAlbumResponseDto,
  RandomArtistResponseDto,
} from '../dtos/explore.dto';

describe('ExploreController', () => {
  let controller: ExploreController;
  let exploreService: jest.Mocked<ExploreService>;

  const mockUser = { id: 'user-1', username: 'testuser', userId: 'user-1' };

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExploreController],
      providers: [
        {
          provide: ExploreService,
          useValue: {
            getUnplayedAlbums: jest.fn(),
            getForgottenAlbums: jest.fn(),
            getHiddenGems: jest.fn(),
            getRandomAlbum: jest.fn(),
            getRandomArtist: jest.fn(),
            getRandomAlbums: jest.fn(),
          },
        },
        { provide: getLoggerToken(ExploreController.name), useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<ExploreController>(ExploreController);
    exploreService = module.get(ExploreService);
  });

  describe('getUnplayedAlbums', () => {
    it('should return unplayed albums for the user', async () => {
      const mockResult = {
        albums: [{ id: 'album-1', name: 'Unplayed Album' }],
        total: 1,
      };
      exploreService.getUnplayedAlbums.mockResolvedValue(
        mockResult as unknown as ExploreAlbumsResponseDto
      );

      const req = { user: mockUser } as unknown as RequestWithUser;
      const query = { limit: 20, offset: 0 };

      const result = await controller.getUnplayedAlbums(req, query as ExploreQueryDto);

      expect(exploreService.getUnplayedAlbums).toHaveBeenCalledWith('user-1', 20, 0);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });
  });

  describe('getForgottenAlbums', () => {
    it('should return forgotten albums for the user', async () => {
      const mockResult = {
        albums: [{ id: 'album-2', name: 'Forgotten Album' }],
        total: 1,
      };
      exploreService.getForgottenAlbums.mockResolvedValue(
        mockResult as unknown as ExploreAlbumsResponseDto
      );

      const req = { user: mockUser } as unknown as RequestWithUser;
      const query = { limit: 20, offset: 0, monthsAgo: 3 };

      const result = await controller.getForgottenAlbums(req, query as ForgottenAlbumsQueryDto);

      expect(exploreService.getForgottenAlbums).toHaveBeenCalledWith('user-1', 3, 20, 0);
      expect(result.limit).toBe(20);
    });
  });

  describe('getHiddenGems', () => {
    it('should return hidden gem tracks', async () => {
      const mockTracks = [{ id: 'track-1', title: 'Hidden Gem' }];
      exploreService.getHiddenGems.mockResolvedValue(
        mockTracks as unknown as ExploreTracksResponseDto['tracks']
      );

      const req = { user: mockUser } as unknown as RequestWithUser;
      const query = { limit: 30 };

      const result = await controller.getHiddenGems(req, query as ExploreQueryDto);

      expect(exploreService.getHiddenGems).toHaveBeenCalledWith('user-1', 30);
      expect(result.tracks).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getRandomAlbum', () => {
    it('should return a random album', async () => {
      const mockAlbum = { id: 'album-3', name: 'Random Album' };
      exploreService.getRandomAlbum.mockResolvedValue(
        mockAlbum as unknown as RandomAlbumResponseDto['album']
      );

      const result = await controller.getRandomAlbum();

      expect(exploreService.getRandomAlbum).toHaveBeenCalled();
      expect(result.album).toEqual(mockAlbum);
    });
  });

  describe('getRandomArtist', () => {
    it('should return a random artist', async () => {
      const mockArtist = { id: 'artist-1', name: 'Random Artist' };
      exploreService.getRandomArtist.mockResolvedValue(
        mockArtist as unknown as RandomArtistResponseDto['artist']
      );

      const result = await controller.getRandomArtist();

      expect(exploreService.getRandomArtist).toHaveBeenCalled();
      expect(result.artist).toEqual(mockArtist);
    });
  });

  describe('getRandomAlbums', () => {
    it('should return multiple random albums', async () => {
      const mockAlbums = [
        { id: 'album-4', name: 'Random 1' },
        { id: 'album-5', name: 'Random 2' },
      ];
      exploreService.getRandomAlbums.mockResolvedValue(
        mockAlbums as unknown as RandomAlbumResponseDto['album'][]
      );

      const result = await controller.getRandomAlbums(6);

      expect(exploreService.getRandomAlbums).toHaveBeenCalledWith(6);
      expect(result.albums).toHaveLength(2);
    });

    it('should default to 6 if no count provided', async () => {
      exploreService.getRandomAlbums.mockResolvedValue([]);

      await controller.getRandomAlbums(undefined);

      expect(exploreService.getRandomAlbums).toHaveBeenCalledWith(6);
    });
  });
});
