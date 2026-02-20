import { ReorderPlaylistTracksUseCase } from './reorder-playlist-tracks.use-case';
import { IPlaylistRepository } from '../../ports';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';

describe('ReorderPlaylistTracksUseCase', () => {
  let useCase: ReorderPlaylistTracksUseCase;
  let mockRepo: jest.Mocked<IPlaylistRepository>;

  const mockPlaylist = {
    id: 'playlist-1',
    ownerId: 'user-1',
    name: 'My Playlist',
  };

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      reorderTracks: jest.fn(),
      isTrackInPlaylist: jest.fn(),
    } as any;

    useCase = new ReorderPlaylistTracksUseCase(mockRepo);
  });

  it('should reorder tracks successfully', async () => {
    mockRepo.findById.mockResolvedValue(mockPlaylist as any);
    mockRepo.isTrackInPlaylist.mockResolvedValue(true);
    mockRepo.reorderTracks.mockResolvedValue(true);

    const result = await useCase.execute({
      playlistId: 'playlist-1',
      userId: 'user-1',
      trackOrders: [
        { trackId: 'track-1', order: 0 },
        { trackId: 'track-2', order: 1 },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.playlistId).toBe('playlist-1');
    expect(mockRepo.reorderTracks).toHaveBeenCalledWith('playlist-1', [
      { trackId: 'track-1', order: 0 },
      { trackId: 'track-2', order: 1 },
    ]);
  });

  it('should throw ValidationError when playlistId is empty', async () => {
    await expect(
      useCase.execute({
        playlistId: '',
        userId: 'user-1',
        trackOrders: [{ trackId: 'track-1', order: 0 }],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when playlistId is whitespace', async () => {
    await expect(
      useCase.execute({
        playlistId: '   ',
        userId: 'user-1',
        trackOrders: [{ trackId: 'track-1', order: 0 }],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when trackOrders is empty', async () => {
    await expect(
      useCase.execute({
        playlistId: 'playlist-1',
        userId: 'user-1',
        trackOrders: [],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw NotFoundError when playlist does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        playlistId: 'nonexistent',
        userId: 'user-1',
        trackOrders: [{ trackId: 'track-1', order: 0 }],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw ForbiddenError when user is not the owner', async () => {
    mockRepo.findById.mockResolvedValue(mockPlaylist as any);

    await expect(
      useCase.execute({
        playlistId: 'playlist-1',
        userId: 'other-user',
        trackOrders: [{ trackId: 'track-1', order: 0 }],
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('should throw ValidationError when trackId is empty in trackOrders', async () => {
    mockRepo.findById.mockResolvedValue(mockPlaylist as any);

    await expect(
      useCase.execute({
        playlistId: 'playlist-1',
        userId: 'user-1',
        trackOrders: [{ trackId: '', order: 0 }],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when order is negative', async () => {
    mockRepo.findById.mockResolvedValue(mockPlaylist as any);

    await expect(
      useCase.execute({
        playlistId: 'playlist-1',
        userId: 'user-1',
        trackOrders: [{ trackId: 'track-1', order: -1 }],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw NotFoundError when track is not in playlist', async () => {
    mockRepo.findById.mockResolvedValue(mockPlaylist as any);
    mockRepo.isTrackInPlaylist.mockResolvedValue(false);

    await expect(
      useCase.execute({
        playlistId: 'playlist-1',
        userId: 'user-1',
        trackOrders: [{ trackId: 'track-999', order: 0 }],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw ValidationError when reorderTracks fails', async () => {
    mockRepo.findById.mockResolvedValue(mockPlaylist as any);
    mockRepo.isTrackInPlaylist.mockResolvedValue(true);
    mockRepo.reorderTracks.mockResolvedValue(false);

    await expect(
      useCase.execute({
        playlistId: 'playlist-1',
        userId: 'user-1',
        trackOrders: [{ trackId: 'track-1', order: 0 }],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should validate all tracks before reordering', async () => {
    mockRepo.findById.mockResolvedValue(mockPlaylist as any);
    mockRepo.isTrackInPlaylist
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(
      useCase.execute({
        playlistId: 'playlist-1',
        userId: 'user-1',
        trackOrders: [
          { trackId: 'track-1', order: 0 },
          { trackId: 'track-missing', order: 1 },
        ],
      }),
    ).rejects.toThrow(NotFoundError);

    expect(mockRepo.reorderTracks).not.toHaveBeenCalled();
  });
});
