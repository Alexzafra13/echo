import { Test, TestingModule } from '@nestjs/testing';
import { GetPlaylistsByArtistUseCase } from './get-playlists-by-artist.use-case';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { Playlist } from '../../entities';

describe('GetPlaylistsByArtistUseCase', () => {
  let useCase: GetPlaylistsByArtistUseCase;
  let repository: jest.Mocked<IPlaylistRepository>;

  const now = new Date('2025-01-01');

  const mockPlaylists = [
    Playlist.fromPrimitives({
      id: 'playlist-1',
      name: 'Rock Hits',
      description: 'Best rock songs',
      coverImageUrl: '/covers/playlist-1.jpg',
      duration: 7200,
      size: 200000000,
      ownerId: 'user-1',
      public: true,
      songCount: 20,
      sync: false,
      createdAt: now,
      updatedAt: now,
    }),
    Playlist.fromPrimitives({
      id: 'playlist-2',
      name: 'Artist Mix',
      description: undefined,
      duration: 3600,
      size: 100000000,
      ownerId: 'user-2',
      public: true,
      songCount: 10,
      sync: false,
      createdAt: now,
      updatedAt: now,
    }),
  ];

  beforeEach(async () => {
    const mockRepository: Partial<IPlaylistRepository> = {
      findPublicByArtistId: jest.fn(),
      countPublicByArtistId: jest.fn(),
      getBatchPlaylistAlbumIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPlaylistsByArtistUseCase,
        {
          provide: PLAYLIST_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetPlaylistsByArtistUseCase>(GetPlaylistsByArtistUseCase);
    repository = module.get(PLAYLIST_REPOSITORY);
  });

  describe('execute', () => {
    it('should return playlists by artist with pagination', async () => {
      (repository.findPublicByArtistId as jest.Mock).mockResolvedValue(mockPlaylists);
      (repository.countPublicByArtistId as jest.Mock).mockResolvedValue(2);
      (repository.getBatchPlaylistAlbumIds as jest.Mock).mockResolvedValue(
        new Map([
          ['playlist-1', ['album-1', 'album-2']],
          ['playlist-2', ['album-3']],
        ]),
      );

      const result = await useCase.execute({ artistId: 'artist-1' });

      expect(repository.findPublicByArtistId).toHaveBeenCalledWith('artist-1', 0, 20);
      expect(repository.countPublicByArtistId).toHaveBeenCalledWith('artist-1');
      expect(repository.getBatchPlaylistAlbumIds).toHaveBeenCalledWith([
        'playlist-1',
        'playlist-2',
      ]);
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it('should include album IDs in playlist items', async () => {
      (repository.findPublicByArtistId as jest.Mock).mockResolvedValue([mockPlaylists[0]]);
      (repository.countPublicByArtistId as jest.Mock).mockResolvedValue(1);
      (repository.getBatchPlaylistAlbumIds as jest.Mock).mockResolvedValue(
        new Map([['playlist-1', ['album-1', 'album-2']]]),
      );

      const result = await useCase.execute({ artistId: 'artist-1' });

      expect(result.items[0].albumIds).toEqual(['album-1', 'album-2']);
    });

    it('should use empty array when no album IDs found for playlist', async () => {
      (repository.findPublicByArtistId as jest.Mock).mockResolvedValue([mockPlaylists[0]]);
      (repository.countPublicByArtistId as jest.Mock).mockResolvedValue(1);
      (repository.getBatchPlaylistAlbumIds as jest.Mock).mockResolvedValue(new Map());

      const result = await useCase.execute({ artistId: 'artist-1' });

      expect(result.items[0].albumIds).toEqual([]);
    });

    it('should pass custom skip and take', async () => {
      (repository.findPublicByArtistId as jest.Mock).mockResolvedValue(mockPlaylists);
      (repository.countPublicByArtistId as jest.Mock).mockResolvedValue(50);
      (repository.getBatchPlaylistAlbumIds as jest.Mock).mockResolvedValue(new Map());

      const result = await useCase.execute({ artistId: 'artist-1', skip: 10, take: 5 });

      expect(repository.findPublicByArtistId).toHaveBeenCalledWith('artist-1', 10, 5);
      expect(result.skip).toBe(10);
      expect(result.take).toBe(5);
    });

    it('should clamp negative skip to 0', async () => {
      (repository.findPublicByArtistId as jest.Mock).mockResolvedValue([]);
      (repository.countPublicByArtistId as jest.Mock).mockResolvedValue(0);
      (repository.getBatchPlaylistAlbumIds as jest.Mock).mockResolvedValue(new Map());

      const result = await useCase.execute({ artistId: 'artist-1', skip: -5 });

      expect(repository.findPublicByArtistId).toHaveBeenCalledWith('artist-1', 0, 20);
      expect(result.skip).toBe(0);
    });

    it('should clamp take to maximum of 100', async () => {
      (repository.findPublicByArtistId as jest.Mock).mockResolvedValue([]);
      (repository.countPublicByArtistId as jest.Mock).mockResolvedValue(0);
      (repository.getBatchPlaylistAlbumIds as jest.Mock).mockResolvedValue(new Map());

      const result = await useCase.execute({ artistId: 'artist-1', take: 500 });

      expect(repository.findPublicByArtistId).toHaveBeenCalledWith('artist-1', 0, 100);
      expect(result.take).toBe(100);
    });

    it('should return empty items when no playlists found', async () => {
      (repository.findPublicByArtistId as jest.Mock).mockResolvedValue([]);
      (repository.countPublicByArtistId as jest.Mock).mockResolvedValue(0);
      (repository.getBatchPlaylistAlbumIds as jest.Mock).mockResolvedValue(new Map());

      const result = await useCase.execute({ artistId: 'artist-no-playlists' });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should map playlist properties correctly', async () => {
      (repository.findPublicByArtistId as jest.Mock).mockResolvedValue([mockPlaylists[0]]);
      (repository.countPublicByArtistId as jest.Mock).mockResolvedValue(1);
      (repository.getBatchPlaylistAlbumIds as jest.Mock).mockResolvedValue(
        new Map([['playlist-1', ['album-1']]]),
      );

      const result = await useCase.execute({ artistId: 'artist-1' });

      const item = result.items[0];
      expect(item.id).toBe('playlist-1');
      expect(item.name).toBe('Rock Hits');
      expect(item.description).toBe('Best rock songs');
      expect(item.ownerId).toBe('user-1');
      expect(item.public).toBe(true);
      expect(item.songCount).toBe(20);
      expect(item.duration).toBe(7200);
    });

    it('should propagate repository errors', async () => {
      (repository.findPublicByArtistId as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(useCase.execute({ artistId: 'artist-1' })).rejects.toThrow('Database error');
    });
  });
});
