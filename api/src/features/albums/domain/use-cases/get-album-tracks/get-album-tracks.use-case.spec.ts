import { GetAlbumTracksUseCase } from './get-album-tracks.use-case';
import { IAlbumRepository } from '../../ports';
import { ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { Album } from '../../entities/album.entity';
import { Track } from '@features/tracks/domain/entities/track.entity';
import { NotFoundError } from '@shared/errors';

describe('GetAlbumTracksUseCase', () => {
  let useCase: GetAlbumTracksUseCase;
  let mockAlbumRepo: jest.Mocked<IAlbumRepository>;
  let mockTrackRepo: jest.Mocked<ITrackRepository>;

  const mockAlbum = Album.reconstruct({
    id: 'album-123',
    name: 'OK Computer',
    artistId: 'artist-radiohead',
    artistName: 'Radiohead',
    compilation: false,
    songCount: 3,
    duration: 600,
    size: 50000000,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockTracks = [
    Track.reconstruct({
      id: 'track-1',
      title: 'Airbag',
      albumId: 'album-123',
      artistId: 'artist-radiohead',
      trackNumber: 1,
      discNumber: 1,
      duration: 287,
      path: '/music/airbag.flac',
      compilation: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    Track.reconstruct({
      id: 'track-2',
      title: 'Paranoid Android',
      albumId: 'album-123',
      artistId: 'artist-radiohead',
      trackNumber: 2,
      discNumber: 1,
      duration: 386,
      path: '/music/paranoid-android.flac',
      compilation: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    Track.reconstruct({
      id: 'track-3',
      title: 'Subterranean Homesick Alien',
      albumId: 'album-123',
      artistId: 'artist-radiohead',
      trackNumber: 3,
      discNumber: 1,
      duration: 270,
      path: '/music/subterranean.flac',
      compilation: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  ];

  beforeEach(() => {
    mockAlbumRepo = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<IAlbumRepository>;

    mockTrackRepo = {
      findByAlbumId: jest.fn(),
      countByAlbumId: jest.fn(),
    } as unknown as jest.Mocked<ITrackRepository>;

    useCase = new GetAlbumTracksUseCase(mockAlbumRepo, mockTrackRepo);
  });

  describe('execute', () => {
    it('should return paginated tracks for existing album', async () => {
      mockAlbumRepo.findById.mockResolvedValue(mockAlbum);
      mockTrackRepo.findByAlbumId.mockResolvedValue(mockTracks);
      mockTrackRepo.countByAlbumId.mockResolvedValue(3);

      const result = await useCase.execute({ albumId: 'album-123' });

      expect(mockAlbumRepo.findById).toHaveBeenCalledWith('album-123');
      expect(mockTrackRepo.findByAlbumId).toHaveBeenCalledWith('album-123', true, 0, 10);
      expect(mockTrackRepo.countByAlbumId).toHaveBeenCalledWith('album-123');
      expect(result.albumId).toBe('album-123');
      expect(result.tracks).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(10);
      expect(result.hasMore).toBe(false);
    });

    it('should respect skip and take parameters', async () => {
      mockAlbumRepo.findById.mockResolvedValue(mockAlbum);
      mockTrackRepo.findByAlbumId.mockResolvedValue([mockTracks[1]]);
      mockTrackRepo.countByAlbumId.mockResolvedValue(3);

      const result = await useCase.execute({ albumId: 'album-123', skip: 1, take: 1 });

      expect(mockTrackRepo.findByAlbumId).toHaveBeenCalledWith('album-123', true, 1, 1);
      expect(result.tracks).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(result.skip).toBe(1);
      expect(result.take).toBe(1);
      expect(result.hasMore).toBe(true);
    });

    it('should return tracks in order', async () => {
      mockAlbumRepo.findById.mockResolvedValue(mockAlbum);
      mockTrackRepo.findByAlbumId.mockResolvedValue(mockTracks);
      mockTrackRepo.countByAlbumId.mockResolvedValue(3);

      const result = await useCase.execute({ albumId: 'album-123' });

      expect(result.tracks[0].trackNumber).toBe(1);
      expect(result.tracks[1].trackNumber).toBe(2);
      expect(result.tracks[2].trackNumber).toBe(3);
    });

    it('should throw NotFoundError when album not found', async () => {
      mockAlbumRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute({ albumId: 'non-existent' })).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when albumId is empty', async () => {
      await expect(useCase.execute({ albumId: '' })).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when albumId is whitespace', async () => {
      await expect(useCase.execute({ albumId: '   ' })).rejects.toThrow(NotFoundError);
    });

    it('should return empty tracks array for album with no tracks', async () => {
      mockAlbumRepo.findById.mockResolvedValue(mockAlbum);
      mockTrackRepo.findByAlbumId.mockResolvedValue([]);
      mockTrackRepo.countByAlbumId.mockResolvedValue(0);

      const result = await useCase.execute({ albumId: 'album-123' });

      expect(result.tracks).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should include tracks from multiple discs', async () => {
      const multiDiscTracks = [
        ...mockTracks,
        Track.reconstruct({
          id: 'track-4',
          title: 'Disc 2 Track 1',
          albumId: 'album-123',
          artistId: 'artist-radiohead',
          trackNumber: 1,
          discNumber: 2,
          duration: 300,
          path: '/music/disc2-track1.flac',
          compilation: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];

      mockAlbumRepo.findById.mockResolvedValue(mockAlbum);
      mockTrackRepo.findByAlbumId.mockResolvedValue(multiDiscTracks);
      mockTrackRepo.countByAlbumId.mockResolvedValue(4);

      const result = await useCase.execute({ albumId: 'album-123' });

      expect(result.tracks).toHaveLength(4);
      expect(result.total).toBe(4);
      const discNumbers = result.tracks.map((t) => t.discNumber);
      expect(discNumbers).toContain(1);
      expect(discNumbers).toContain(2);
    });

    it('should not call track repository if album not found', async () => {
      mockAlbumRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute({ albumId: 'non-existent' })).rejects.toThrow();

      expect(mockTrackRepo.findByAlbumId).not.toHaveBeenCalled();
    });
  });
});
