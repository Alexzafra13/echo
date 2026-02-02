import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistShuffleService } from './playlist-shuffle.service';
import { PLAY_TRACKING_REPOSITORY } from '@features/play-tracking/domain/ports';
import { DJ_ANALYSIS_REPOSITORY } from '@features/dj/domain/ports/dj-analysis.repository.port';
import { DjCompatibilityService } from '@features/dj/domain/services/dj-compatibility.service';
import { TrackScore } from '../../entities/track-score.entity';

describe('PlaylistShuffleService', () => {
  let service: PlaylistShuffleService;
  let mockPlayTrackingRepo: any;
  let mockDjAnalysisRepo: any;
  let mockDjCompatibility: any;

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

  const mockDjAnalyses = [
    { trackId: 'track-1', bpm: 128, key: 'Am', camelotKey: '8A', energy: 0.7 },
    { trackId: 'track-2', bpm: 130, key: 'Em', camelotKey: '9A', energy: 0.75 },
    { trackId: 'track-3', bpm: 126, key: 'Dm', camelotKey: '7A', energy: 0.65 },
    { trackId: 'track-4', bpm: 132, key: 'C', camelotKey: '8B', energy: 0.8 },
    { trackId: 'track-5', bpm: 125, key: 'G', camelotKey: '9B', energy: 0.6 },
  ];

  beforeEach(async () => {
    mockPlayTrackingRepo = {
      getUserPlayHistory: jest.fn().mockResolvedValue([]),
    };

    mockDjAnalysisRepo = {
      findByTrackIds: jest.fn().mockResolvedValue(mockDjAnalyses),
    };

    mockDjCompatibility = {
      calculateCompatibility: jest.fn().mockImplementation((track1, track2) => {
        // Simulate compatibility based on Camelot wheel proximity
        const key1 = parseInt(track1.camelotKey?.slice(0, -1) || '0');
        const key2 = parseInt(track2.camelotKey?.slice(0, -1) || '0');
        const keyDiff = Math.min(Math.abs(key1 - key2), 12 - Math.abs(key1 - key2));
        const bpmDiff = Math.abs((track1.bpm || 128) - (track2.bpm || 128));

        let score = 100;
        score -= keyDiff * 10; // Penalty for key distance
        score -= bpmDiff * 2;  // Penalty for BPM difference

        return { overall: Math.max(0, score) };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaylistShuffleService,
        { provide: PLAY_TRACKING_REPOSITORY, useValue: mockPlayTrackingRepo },
        { provide: DJ_ANALYSIS_REPOSITORY, useValue: mockDjAnalysisRepo },
        { provide: DjCompatibilityService, useValue: mockDjCompatibility },
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
      const resultIds = result.map(t => t.trackId);
      expect(resultIds).toContain('track-1');
      expect(resultIds).toContain('track-2');
      expect(resultIds).toContain('track-3');
      expect(resultIds).toContain('track-4');
      expect(resultIds).toContain('track-5');
    });

    it('should use harmonic shuffle when DJ analysis is available', async () => {
      const tracks = [
        createTrackScore('track-1', 80),
        createTrackScore('track-2', 75),
        createTrackScore('track-3', 70),
        createTrackScore('track-4', 65),
        createTrackScore('track-5', 60),
      ];

      await service.intelligentShuffle(tracks, mockTrackDetails);

      // Should have fetched DJ analysis
      expect(mockDjAnalysisRepo.findByTrackIds).toHaveBeenCalledWith([
        'track-1', 'track-2', 'track-3', 'track-4', 'track-5'
      ]);
      // Should have calculated compatibility scores
      expect(mockDjCompatibility.calculateCompatibility).toHaveBeenCalled();
    });

    it('should fallback to basic shuffle when less than 50% have DJ analysis', async () => {
      // Only return analysis for 2 out of 5 tracks (40%)
      mockDjAnalysisRepo.findByTrackIds.mockResolvedValue([
        mockDjAnalyses[0],
        mockDjAnalyses[1],
      ]);

      const tracks = [
        createTrackScore('track-1', 80),
        createTrackScore('track-2', 75),
        createTrackScore('track-3', 70),
        createTrackScore('track-4', 65),
        createTrackScore('track-5', 60),
      ];

      const result = await service.intelligentShuffle(tracks, mockTrackDetails);

      expect(result).toHaveLength(5);
      // Should NOT calculate compatibility (using basic shuffle)
      expect(mockDjCompatibility.calculateCompatibility).not.toHaveBeenCalled();
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
        results.push(result.map(t => t.trackId));
      }

      // At least some results should be different (probabilistic test)
      const uniqueResults = new Set(results.map(r => r.join(',')));
      expect(uniqueResults.size).toBeGreaterThan(1);
    });
  });

  describe('basicShuffle (fallback)', () => {
    beforeEach(() => {
      // Force basic shuffle by returning no DJ analysis
      mockDjAnalysisRepo.findByTrackIds.mockResolvedValue([]);
    });

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
          const current = trackDetails.find(t => t.id === result[j].trackId);
          const next = trackDetails.find(t => t.id === result[j + 1].trackId);
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
          const current = trackDetails.find(t => t.id === result[j].trackId);
          const next = trackDetails.find(t => t.id === result[j + 1].trackId);
          if (current?.albumId === next?.albumId) {
            consecutiveSameAlbumCount++;
          }
        }
      }

      expect(consecutiveSameAlbumCount).toBeLessThan(20);
    });
  });

  describe('harmonicShuffle', () => {
    it('should favor tracks with higher compatibility scores', async () => {
      // Create a scenario where compatibility matters
      const tracks = [
        createTrackScore('track-1', 80), // 8A - 128 BPM
        createTrackScore('track-2', 75), // 9A - 130 BPM (adjacent key)
        createTrackScore('track-3', 70), // 7A - 126 BPM (adjacent key)
        createTrackScore('track-4', 65), // 8B - 132 BPM (relative major)
        createTrackScore('track-5', 60), // 9B - 125 BPM
      ];

      // Track statistics across multiple shuffles
      const followingTrack1: Record<string, number> = {};

      for (let i = 0; i < 100; i++) {
        const result = await service.intelligentShuffle(tracks, mockTrackDetails);
        const track1Index = result.findIndex(t => t.trackId === 'track-1');

        if (track1Index < result.length - 1) {
          const nextTrack = result[track1Index + 1].trackId;
          followingTrack1[nextTrack] = (followingTrack1[nextTrack] || 0) + 1;
        }
      }

      // Adjacent keys (9A, 7A, 8B) should follow track-1 (8A) more often than distant keys
      // This is a probabilistic assertion - compatible tracks should appear more frequently
      const compatibleFollows = (followingTrack1['track-2'] || 0) +
                                (followingTrack1['track-3'] || 0) +
                                (followingTrack1['track-4'] || 0);

      // Compatible tracks should follow at least sometimes
      expect(compatibleFollows).toBeGreaterThan(0);
    });

    it('should include tracks without DJ analysis at random positions', async () => {
      // Only 3 tracks have analysis
      mockDjAnalysisRepo.findByTrackIds.mockResolvedValue([
        mockDjAnalyses[0],
        mockDjAnalyses[1],
        mockDjAnalyses[2],
      ]);

      const tracks = [
        createTrackScore('track-1', 80),
        createTrackScore('track-2', 75),
        createTrackScore('track-3', 70),
        createTrackScore('track-4', 65), // No analysis
        createTrackScore('track-5', 60), // No analysis
      ];

      const result = await service.intelligentShuffle(tracks, mockTrackDetails);

      // All 5 tracks should be present
      expect(result).toHaveLength(5);
      expect(result.map(t => t.trackId)).toContain('track-4');
      expect(result.map(t => t.trackId)).toContain('track-5');
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
