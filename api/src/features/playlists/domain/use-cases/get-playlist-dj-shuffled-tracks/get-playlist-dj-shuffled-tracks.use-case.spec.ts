import { Test, TestingModule } from '@nestjs/testing';
import { GetPlaylistDjShuffledTracksUseCase } from './get-playlist-dj-shuffled-tracks.use-case';
import { IPlaylistRepository, PLAYLIST_REPOSITORY, TrackWithPlaylistOrder } from '../../ports';
import {
  IDjAnalysisRepository,
  DJ_ANALYSIS_REPOSITORY,
} from '@features/dj/domain/ports/dj-analysis.repository.port';
import { DjAnalysis } from '@features/dj/domain/entities/dj-analysis.entity';
import { Playlist } from '../../entities';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';

describe('GetPlaylistDjShuffledTracksUseCase', () => {
  let useCase: GetPlaylistDjShuffledTracksUseCase;
  let playlistRepo: jest.Mocked<IPlaylistRepository>;
  let djAnalysisRepo: jest.Mocked<IDjAnalysisRepository>;

  const mockPlaylist = Playlist.fromPrimitives({
    id: 'playlist-1',
    name: 'My Playlist',
    description: 'A test playlist',
    duration: 3600,
    size: 100000000,
    ownerId: 'owner-1',
    public: true,
    songCount: 3,
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
      bpm: 120,
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
      bpm: 125,
      createdAt: now,
      updatedAt: now,
    } as TrackWithPlaylistOrder,
    {
      id: 'track-3',
      title: 'Song Three',
      trackNumber: 3,
      discNumber: 1,
      duration: 200,
      size: 4500000,
      path: '/music/song-three.mp3',
      albumId: 'album-2',
      artistId: 'artist-2',
      artistName: 'Artist Two',
      albumName: 'Album Two',
      playlistOrder: 3,
      compilation: false,
      bpm: 128,
      createdAt: now,
      updatedAt: now,
    } as TrackWithPlaylistOrder,
  ];

  const mockDjAnalyses = [
    DjAnalysis.fromPrimitives({
      id: 'dj-1',
      trackId: 'track-1',
      bpm: 120,
      key: 'Am',
      camelotKey: '8A',
      energy: 0.7,
      danceability: 0.8,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    }),
    DjAnalysis.fromPrimitives({
      id: 'dj-2',
      trackId: 'track-2',
      bpm: 125,
      key: 'Bm',
      camelotKey: '10A',
      energy: 0.6,
      danceability: 0.7,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    }),
    DjAnalysis.fromPrimitives({
      id: 'dj-3',
      trackId: 'track-3',
      bpm: 128,
      key: 'Cm',
      camelotKey: '5A',
      energy: 0.8,
      danceability: 0.9,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    }),
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPlaylistDjShuffledTracksUseCase,
        {
          provide: PLAYLIST_REPOSITORY,
          useValue: {
            findById: jest.fn(),
            getPlaylistTracks: jest.fn(),
          },
        },
        {
          provide: DJ_ANALYSIS_REPOSITORY,
          useValue: {
            findByTrackIds: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(GetPlaylistDjShuffledTracksUseCase);
    playlistRepo = module.get(PLAYLIST_REPOSITORY);
    djAnalysisRepo = module.get(DJ_ANALYSIS_REPOSITORY);
  });

  describe('validation', () => {
    it('should throw ValidationError when playlistId is empty', async () => {
      await expect(useCase.execute({ playlistId: '', requesterId: 'user-1' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError when playlistId is whitespace', async () => {
      await expect(useCase.execute({ playlistId: '   ', requesterId: 'user-1' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw NotFoundError when playlist does not exist', async () => {
      (playlistRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        useCase.execute({ playlistId: 'nonexistent', requesterId: 'user-1' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError for private playlist with different requester', async () => {
      (playlistRepo.findById as jest.Mock).mockResolvedValue(mockPrivatePlaylist);

      await expect(
        useCase.execute({ playlistId: 'playlist-private', requesterId: 'other-user' })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow owner to access private playlist', async () => {
      (playlistRepo.findById as jest.Mock).mockResolvedValue(mockPrivatePlaylist);
      (playlistRepo.getPlaylistTracks as jest.Mock).mockResolvedValue([]);
      (djAnalysisRepo.findByTrackIds as jest.Mock).mockResolvedValue([]);

      const result = await useCase.execute({
        playlistId: 'playlist-private',
        requesterId: 'owner-1',
      });

      expect(result.playlistId).toBe('playlist-private');
    });
  });

  describe('empty playlist', () => {
    it('should return empty tracks with djMode false', async () => {
      (playlistRepo.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (playlistRepo.getPlaylistTracks as jest.Mock).mockResolvedValue([]);

      const result = await useCase.execute({
        playlistId: 'playlist-1',
        requesterId: 'owner-1',
      });

      expect(result.tracks).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.djMode).toBe(false);
    });
  });

  describe('DJ-aware shuffle', () => {
    it('should return djMode true when enough tracks have DJ analysis', async () => {
      (playlistRepo.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (playlistRepo.getPlaylistTracks as jest.Mock).mockResolvedValue(mockTracks);
      (djAnalysisRepo.findByTrackIds as jest.Mock).mockResolvedValue(mockDjAnalyses);

      const result = await useCase.execute({
        playlistId: 'playlist-1',
        requesterId: 'owner-1',
        seed: 0.5,
      });

      expect(result.djMode).toBe(true);
      expect(result.tracks).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.seed).toBe(0.5);
      expect(result.playlistId).toBe('playlist-1');
      expect(result.playlistName).toBe('My Playlist');
    });

    it('should return all track IDs (no duplicates, no missing)', async () => {
      (playlistRepo.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (playlistRepo.getPlaylistTracks as jest.Mock).mockResolvedValue(mockTracks);
      (djAnalysisRepo.findByTrackIds as jest.Mock).mockResolvedValue(mockDjAnalyses);

      const result = await useCase.execute({
        playlistId: 'playlist-1',
        requesterId: 'owner-1',
        seed: 0.5,
      });

      const trackIds = result.tracks.map((t) => t.id).sort();
      expect(trackIds).toEqual(['track-1', 'track-2', 'track-3']);
    });

    it('should prefer DJ analysis BPM over track BPM', async () => {
      const tracksWithDiffBpm = [
        { ...mockTracks[0], bpm: 100 } as TrackWithPlaylistOrder, // ID3 says 100
      ];
      // DJ analysis says 120
      const analyses = [mockDjAnalyses[0]];

      (playlistRepo.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (playlistRepo.getPlaylistTracks as jest.Mock).mockResolvedValue(tracksWithDiffBpm);
      (djAnalysisRepo.findByTrackIds as jest.Mock).mockResolvedValue(analyses);

      const result = await useCase.execute({
        playlistId: 'playlist-1',
        requesterId: 'owner-1',
        seed: 0.5,
      });

      // DJ BPM (120) should be preferred over ID3 BPM (100)
      expect(result.tracks[0].bpm).toBe(120);
    });

    it('should interleave tracks without DJ analysis', async () => {
      // Only 2 out of 3 tracks have analysis (still >= 50%)
      const partialAnalyses = [mockDjAnalyses[0], mockDjAnalyses[1]];

      (playlistRepo.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (playlistRepo.getPlaylistTracks as jest.Mock).mockResolvedValue(mockTracks);
      (djAnalysisRepo.findByTrackIds as jest.Mock).mockResolvedValue(partialAnalyses);

      const result = await useCase.execute({
        playlistId: 'playlist-1',
        requesterId: 'owner-1',
        seed: 0.5,
      });

      expect(result.djMode).toBe(true);
      expect(result.tracks).toHaveLength(3);
      // track-3 has no DJ analysis but should still be included
      const trackIds = result.tracks.map((t) => t.id).sort();
      expect(trackIds).toEqual(['track-1', 'track-2', 'track-3']);
    });
  });

  describe('fallback shuffle', () => {
    it('should return djMode false when not enough DJ coverage', async () => {
      // Only 1 out of 3 tracks has analysis (33% < 50%)
      const lowCoverageAnalyses = [mockDjAnalyses[0]];

      (playlistRepo.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (playlistRepo.getPlaylistTracks as jest.Mock).mockResolvedValue(mockTracks);
      (djAnalysisRepo.findByTrackIds as jest.Mock).mockResolvedValue(lowCoverageAnalyses);

      const result = await useCase.execute({
        playlistId: 'playlist-1',
        requesterId: 'owner-1',
        seed: 0.5,
      });

      expect(result.djMode).toBe(false);
      expect(result.tracks).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should return djMode false when no DJ analysis exists', async () => {
      (playlistRepo.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (playlistRepo.getPlaylistTracks as jest.Mock).mockResolvedValue(mockTracks);
      (djAnalysisRepo.findByTrackIds as jest.Mock).mockResolvedValue([]);

      const result = await useCase.execute({
        playlistId: 'playlist-1',
        requesterId: 'owner-1',
        seed: 0.5,
      });

      expect(result.djMode).toBe(false);
      expect(result.tracks).toHaveLength(3);
    });

    it('should ignore pending/failed analyses for coverage check', async () => {
      const pendingAnalyses = [
        DjAnalysis.fromPrimitives({
          id: 'dj-pending',
          trackId: 'track-1',
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        }),
        DjAnalysis.fromPrimitives({
          id: 'dj-failed',
          trackId: 'track-2',
          status: 'failed',
          analysisError: 'some error',
          createdAt: now,
          updatedAt: now,
        }),
      ];

      (playlistRepo.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (playlistRepo.getPlaylistTracks as jest.Mock).mockResolvedValue(mockTracks);
      (djAnalysisRepo.findByTrackIds as jest.Mock).mockResolvedValue(pendingAnalyses);

      const result = await useCase.execute({
        playlistId: 'playlist-1',
        requesterId: 'owner-1',
        seed: 0.5,
      });

      expect(result.djMode).toBe(false);
    });

    it('should produce deterministic results with same seed', async () => {
      (playlistRepo.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (playlistRepo.getPlaylistTracks as jest.Mock).mockResolvedValue(mockTracks);
      (djAnalysisRepo.findByTrackIds as jest.Mock).mockResolvedValue([]);

      const result1 = await useCase.execute({
        playlistId: 'playlist-1',
        requesterId: 'owner-1',
        seed: 0.42,
      });

      const result2 = await useCase.execute({
        playlistId: 'playlist-1',
        requesterId: 'owner-1',
        seed: 0.42,
      });

      expect(result1.tracks.map((t) => t.id)).toEqual(result2.tracks.map((t) => t.id));
    });
  });

  describe('track mapping', () => {
    it('should map all track properties correctly', async () => {
      (playlistRepo.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (playlistRepo.getPlaylistTracks as jest.Mock).mockResolvedValue([mockTracks[0]]);
      (djAnalysisRepo.findByTrackIds as jest.Mock).mockResolvedValue([]);

      const result = await useCase.execute({
        playlistId: 'playlist-1',
        requesterId: 'owner-1',
        seed: 0.5,
      });

      const track = result.tracks[0];
      expect(track.id).toBe('track-1');
      expect(track.title).toBe('Song One');
      expect(track.trackNumber).toBe(1);
      expect(track.discNumber).toBe(1);
      expect(track.duration).toBe(240);
      expect(track.path).toBe('/music/song-one.mp3');
      expect(track.albumId).toBe('album-1');
      expect(track.artistId).toBe('artist-1');
      expect(track.artistName).toBe('Artist One');
      expect(track.albumName).toBe('Album One');
      expect(track.bpm).toBe(120);
    });

    it('should generate seed when not provided', async () => {
      (playlistRepo.findById as jest.Mock).mockResolvedValue(mockPlaylist);
      (playlistRepo.getPlaylistTracks as jest.Mock).mockResolvedValue([]);

      const result = await useCase.execute({
        playlistId: 'playlist-1',
        requesterId: 'owner-1',
      });

      expect(result.seed).toBeGreaterThanOrEqual(0);
      expect(result.seed).toBeLessThan(1);
    });
  });
});
