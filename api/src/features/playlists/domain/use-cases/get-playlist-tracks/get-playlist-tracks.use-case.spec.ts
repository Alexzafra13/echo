import { Test, TestingModule } from '@nestjs/testing';
import { GetPlaylistTracksUseCase } from './get-playlist-tracks.use-case';
import { IPlaylistRepository, PLAYLIST_REPOSITORY, TrackWithPlaylistOrder } from '../../ports';
import { Playlist } from '../../entities';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';

describe('GetPlaylistTracksUseCase', () => {
  let useCase: GetPlaylistTracksUseCase;
  let repository: jest.Mocked<IPlaylistRepository>;

  const mockPlaylist = Playlist.fromPrimitives({
    id: 'playlist-1',
    name: 'My Playlist',
    description: 'A test playlist',
    duration: 3600,
    size: 100000000,
    ownerId: 'owner-1',
    public: true,
    songCount: 2,
    sync: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });

  const mockPrivatePlaylist = Playlist.fromPrimitives({
    id: 'playlist-private',
    name: 'Private Playlist',
    duration: 1800,
    size: 50000000,
    ownerId: 'owner-1',
    public: false,
    songCount: 1,
    sync: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });

  const now = new Date();
  const mockTracks: TrackWithPlaylistOrder[] = [
    {
      id: 'track-1',
      title: 'Song One',
      trackNumber: 1,
      discNumber: 1,
      year: 2024,
      duration: 240,
      size: 5000000,
      path: '/music/song-one.mp3',
      albumId: 'album-1',
      artistId: 'artist-1',
      bitRate: 320,
      suffix: 'mp3',
      artistName: 'Artist One',
      albumName: 'Album One',
      playlistOrder: 1,
      compilation: false,
      createdAt: now,
      updatedAt: now,
    } as TrackWithPlaylistOrder,
    {
      id: 'track-2',
      title: 'Song Two',
      trackNumber: 2,
      discNumber: 1,
      duration: 180,
      size: 4000000,
      path: '/music/song-two.mp3',
      albumId: 'album-1',
      artistId: 'artist-1',
      artistName: 'Artist One',
      albumName: 'Album One',
      playlistOrder: 2,
      compilation: false,
      createdAt: now,
      updatedAt: now,
    } as TrackWithPlaylistOrder,
  ];

  beforeEach(async () => {
    const mockRepository: Partial<IPlaylistRepository> = {
      findById: jest.fn(),
      getPlaylistTracks: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPlaylistTracksUseCase,
        {
          provide: PLAYLIST_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetPlaylistTracksUseCase>(GetPlaylistTracksUseCase);
    repository = module.get(PLAYLIST_REPOSITORY);
  });

  describe('execute', () => {
    it('should return playlist tracks for a public playlist', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (repository.getPlaylistTracks as jest.Mock).mockResolvedValue(mockTracks);

      const result = await useCase.execute({ playlistId: 'playlist-1' });

      expect(repository.findById).toHaveBeenCalledWith('playlist-1');
      expect(repository.getPlaylistTracks).toHaveBeenCalledWith('playlist-1');
      expect(result.playlistId).toBe('playlist-1');
      expect(result.playlistName).toBe('My Playlist');
      expect(result.tracks).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should throw ValidationError when playlistId is empty', async () => {
      await expect(useCase.execute({ playlistId: '' })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when playlistId is whitespace only', async () => {
      await expect(useCase.execute({ playlistId: '   ' })).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when playlist does not exist', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        useCase.execute({ playlistId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError for private playlist with different requester', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockPrivatePlaylist);

      await expect(
        useCase.execute({ playlistId: 'playlist-private', requesterId: 'other-user' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow owner to access private playlist', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockPrivatePlaylist);
      (repository.getPlaylistTracks as jest.Mock).mockResolvedValue(mockTracks);

      const result = await useCase.execute({
        playlistId: 'playlist-private',
        requesterId: 'owner-1',
      });

      expect(result.playlistId).toBe('playlist-private');
      expect(result.tracks).toHaveLength(2);
    });

    it('should allow access to public playlist with any requesterId', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (repository.getPlaylistTracks as jest.Mock).mockResolvedValue(mockTracks);

      const result = await useCase.execute({
        playlistId: 'playlist-1',
        requesterId: 'random-user',
      });

      expect(result.playlistId).toBe('playlist-1');
    });

    it('should allow access to private playlist without requesterId', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockPrivatePlaylist);
      (repository.getPlaylistTracks as jest.Mock).mockResolvedValue(mockTracks);

      const result = await useCase.execute({ playlistId: 'playlist-private' });

      expect(result.playlistId).toBe('playlist-private');
    });

    it('should map track properties correctly', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (repository.getPlaylistTracks as jest.Mock).mockResolvedValue([mockTracks[0]]);

      const result = await useCase.execute({ playlistId: 'playlist-1' });

      const track = result.tracks[0];
      expect(track.id).toBe('track-1');
      expect(track.title).toBe('Song One');
      expect(track.trackNumber).toBe(1);
      expect(track.discNumber).toBe(1);
      expect(track.duration).toBe(240);
      expect(track.artistName).toBe('Artist One');
      expect(track.albumName).toBe('Album One');
      expect(track.playlistOrder).toBe(1);
    });

    it('should return empty tracks for a playlist with no tracks', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (repository.getPlaylistTracks as jest.Mock).mockResolvedValue([]);

      const result = await useCase.execute({ playlistId: 'playlist-1' });

      expect(result.tracks).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should propagate repository errors', async () => {
      (repository.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(useCase.execute({ playlistId: 'playlist-1' })).rejects.toThrow(
        'Database error',
      );
    });
  });
});
