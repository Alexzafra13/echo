import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistShuffleService } from './playlist-shuffle.service';
import { PLAY_TRACKING_REPOSITORY } from '@features/play-tracking/domain/ports';
import { TrackScore } from '../../entities/track-score.entity';

describe('PlaylistShuffleService', () => {
  let service: PlaylistShuffleService;
  let mockPlayTrackingRepo: { getUserPlayHistory: jest.Mock };

  // Test data
  const createTrackScore = (trackId: string, score: number): TrackScore => ({
    trackId,
    totalScore: score,
    recencyScore: 50,
    frequencyScore: 50,
    artistBonus: 0,
    freshnessBonus: 0,
    genreDiversityBonus: 0,
  });

  const mockTrackDetails = [
    { id: 'track-1', artistId: 'artist-1', albumId: 'album-1' },
    { id: 'track-2', artistId: 'artist-1', albumId: 'album-1' },
    { id: 'track-3', artistId: 'artist-2', albumId: 'album-2' },
    { id: 'track-4', artistId: 'artist-2', albumId: 'album-3' },
    { id: 'track-5', artistId: 'artist-3', albumId: 'album-4' },
  ];

  beforeEach(async () => {
    mockPlayTrackingRepo = {
      getUserPlayHistory: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaylistShuffleService,
        { provide: PLAY_TRACKING_REPOSITORY, useValue: mockPlayTrackingRepo },
      ],
    }).compile();

    service = module.get<PlaylistShuffleService>(PlaylistShuffleService);
  });

  describe('intelligentShuffle', () => {
    it('should return empty array for empty input', async () => {
      const result = await service.intelligentShuffle([], []);
      expect(result).toEqual([]);
    });

    it('should return single track unchanged', async () => {
      const tracks = [createTrackScore('track-1', 80)];
      const result = await service.intelligentShuffle(tracks, mockTrackDetails);
      expect(result).toHaveLength(1);
      expect(result[0].trackId).toBe('track-1');
    });

    it('should shuffle multiple tracks', async () => {
      const tracks = [
        createTrackScore('track-1', 80),
        createTrackScore('track-2', 75),
        createTrackScore('track-3', 70),
        createTrackScore('track-4', 65),
        createTrackScore('track-5', 60),
      ];

      const result = await service.intelligentShuffle(tracks, mockTrackDetails);

      expect(result).toHaveLength(5);
      // All original tracks should be present
      const resultIds = result.map((t) => t.trackId);
      expect(resultIds).toContain('track-1');
      expect(resultIds).toContain('track-2');
      expect(resultIds).toContain('track-3');
      expect(resultIds).toContain('track-4');
      expect(resultIds).toContain('track-5');
    });

    it('should produce different results on multiple calls (randomness)', async () => {
      const tracks = [
        createTrackScore('track-1', 80),
        createTrackScore('track-2', 75),
        createTrackScore('track-3', 70),
        createTrackScore('track-4', 65),
        createTrackScore('track-5', 60),
      ];

      const results: string[][] = [];
      for (let i = 0; i < 10; i++) {
        const result = await service.intelligentShuffle(tracks, mockTrackDetails);
        results.push(result.map((t) => t.trackId));
      }

      // At least some results should be different (probabilistic test)
      const uniqueResults = new Set(results.map((r) => r.join(',')));
      expect(uniqueResults.size).toBeGreaterThan(1);
    });
  });

  describe('basicShuffle', () => {
    it('should avoid consecutive tracks from same artist', async () => {
      // Create tracks with repeated artists
      const tracks = [
        createTrackScore('track-1', 80), // artist-1
        createTrackScore('track-2', 75), // artist-1
        createTrackScore('track-3', 70), // artist-2
      ];

      const trackDetails = [
        { id: 'track-1', artistId: 'artist-1', albumId: 'album-1' },
        { id: 'track-2', artistId: 'artist-1', albumId: 'album-2' },
        { id: 'track-3', artistId: 'artist-2', albumId: 'album-3' },
      ];

      // Run multiple times to check pattern
      let consecutiveSameArtistCount = 0;
      for (let i = 0; i < 20; i++) {
        const result = await service.intelligentShuffle(tracks, trackDetails);

        for (let j = 0; j < result.length - 1; j++) {
          const current = trackDetails.find((t) => t.id === result[j].trackId);
          const next = trackDetails.find((t) => t.id === result[j + 1].trackId);
          if (current?.artistId === next?.artistId) {
            consecutiveSameArtistCount++;
          }
        }
      }

      // Should mostly avoid consecutive same artists (allow some due to limited options)
      expect(consecutiveSameArtistCount).toBeLessThan(20);
    });

    it('should avoid consecutive tracks from same album', async () => {
      const tracks = [
        createTrackScore('track-1', 80),
        createTrackScore('track-2', 75),
        createTrackScore('track-3', 70),
      ];

      const trackDetails = [
        { id: 'track-1', artistId: 'artist-1', albumId: 'album-1' },
        { id: 'track-2', artistId: 'artist-2', albumId: 'album-1' },
        { id: 'track-3', artistId: 'artist-3', albumId: 'album-2' },
      ];

      let consecutiveSameAlbumCount = 0;
      for (let i = 0; i < 20; i++) {
        const result = await service.intelligentShuffle(tracks, trackDetails);

        for (let j = 0; j < result.length - 1; j++) {
          const current = trackDetails.find((t) => t.id === result[j].trackId);
          const next = trackDetails.find((t) => t.id === result[j + 1].trackId);
          if (current?.albumId === next?.albumId) {
            consecutiveSameAlbumCount++;
          }
        }
      }

      expect(consecutiveSameAlbumCount).toBeLessThan(20);
    });
  });

  describe('calculateMetadata', () => {
    it('should calculate playlist metadata correctly', async () => {
      const tracks = [
        createTrackScore('track-1', 80),
        createTrackScore('track-2', 75),
        createTrackScore('track-3', 70),
      ];

      const trackDetails = [
        { id: 'track-1', artistId: 'artist-1', albumId: 'album-1' },
        { id: 'track-2', artistId: 'artist-1', albumId: 'album-2' },
        { id: 'track-3', artistId: 'artist-2', albumId: 'album-3' },
      ];

      const metadata = await service.calculateMetadata('user-1', tracks, trackDetails);

      expect(metadata.totalTracks).toBe(3);
      expect(metadata.avgScore).toBeCloseTo(75, 0);
      expect(metadata.topArtists).toContain('artist-1'); // Appears twice
    });
  });
});
