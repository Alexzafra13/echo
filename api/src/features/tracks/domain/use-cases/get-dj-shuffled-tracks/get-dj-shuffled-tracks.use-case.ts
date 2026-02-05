import { Injectable, Inject } from '@nestjs/common';
import { TRACK_REPOSITORY, ITrackRepository } from '../../ports/track-repository.port';
import { Track } from '../../entities/track.entity';
import {
  IDjAnalysisRepository,
  DJ_ANALYSIS_REPOSITORY,
} from '@features/dj/domain/ports/dj-analysis.repository.port';
import {
  calculateCompatibility,
  TrackDjData,
} from '@features/dj/domain/services/dj-compatibility.service';
import { GetDjShuffledTracksInput, GetDjShuffledTracksOutput, DjShuffledTrack } from './get-dj-shuffled-tracks.dto';

const DEFAULT_TAKE = 50;
const MAX_TAKE = 100;
const MIN_DJ_COVERAGE = 0.5; // 50% of tracks must have DJ analysis

@Injectable()
export class GetDjShuffledTracksUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
    @Inject(DJ_ANALYSIS_REPOSITORY)
    private readonly djAnalysisRepo: IDjAnalysisRepository,
  ) {}

  async execute(input: GetDjShuffledTracksInput = {}): Promise<GetDjShuffledTracksOutput> {
    const seed = input.seed ?? Math.random();
    const skip = Math.max(0, input.skip ?? 0);
    const take = Math.min(MAX_TAKE, Math.max(1, input.take ?? DEFAULT_TAKE));

    // Get total count
    const total = await this.trackRepository.count();

    // For first page (skip=0), try DJ-aware ordering
    if (skip === 0) {
      const djResult = await this.tryDjShuffle(seed, take, total);
      if (djResult) {
        return djResult;
      }
    }

    // Fallback to regular shuffle (or for pagination after first page)
    return this.regularShuffle(seed, skip, take, total);
  }

  /**
   * Attempt DJ-aware shuffle. Returns null if not enough tracks have DJ analysis.
   */
  private async tryDjShuffle(
    seed: number,
    take: number,
    total: number,
  ): Promise<GetDjShuffledTracksOutput | null> {
    // Get a larger pool of tracks to work with
    const poolSize = Math.min(total, take * 3);
    const trackPool = await this.trackRepository.findShuffledPaginated(seed, 0, poolSize);

    if (trackPool.length === 0) {
      return null;
    }

    // Get DJ analysis for these tracks
    const trackIds = trackPool.map((t) => t.id);
    const analyses = await this.djAnalysisRepo.findByTrackIds(trackIds);

    // Check if we have enough DJ coverage
    const completedAnalyses = analyses.filter((a) => a.status === 'completed');
    if (completedAnalyses.length < trackPool.length * MIN_DJ_COVERAGE) {
      return null; // Not enough coverage, fallback to regular shuffle
    }

    // Build DJ data map
    const djDataMap = new Map<string, TrackDjData>();
    for (const analysis of completedAnalyses) {
      djDataMap.set(analysis.trackId, {
        trackId: analysis.trackId,
        bpm: analysis.bpm ?? null,
        key: analysis.key ?? null,
        camelotKey: analysis.camelotKey ?? null,
        energy: analysis.energy ?? null,
        danceability: analysis.danceability ?? null,
      });
    }

    // Separate tracks with and without analysis
    const tracksWithDj = trackPool.filter((t) => djDataMap.has(t.id));
    const tracksWithoutDj = trackPool.filter((t) => !djDataMap.has(t.id));

    // Order tracks with DJ analysis by harmonic compatibility
    const orderedTracks = this.orderByCompatibility(tracksWithDj, djDataMap, seed);

    // Interleave tracks without DJ analysis
    const finalTracks = this.interleave(orderedTracks, tracksWithoutDj, seed);

    // Take only what we need
    const resultTracks = finalTracks.slice(0, take);

    return {
      data: resultTracks.map((t) => this.mapTrack(t)),
      total,
      seed,
      skip: 0,
      take,
      hasMore: take < total,
      djMode: true,
    };
  }

  /**
   * Order tracks by harmonic compatibility using DJ analysis
   */
  private orderByCompatibility(
    tracks: Track[],
    djDataMap: Map<string, TrackDjData>,
    seed: number,
  ): Track[] {
    if (tracks.length <= 1) return tracks;

    const ordered: Track[] = [];
    const remaining = [...tracks];

    // Start with a deterministic random track based on seed
    const startIdx = Math.floor(seed * remaining.length);
    ordered.push(remaining.splice(startIdx, 1)[0]);

    // Build chain by selecting most compatible next track
    while (remaining.length > 0) {
      const lastTrack = ordered[ordered.length - 1];
      const lastDjData = djDataMap.get(lastTrack.id);

      if (!lastDjData) {
        // No DJ data, pick based on seed
        const idx = Math.floor((seed * 1000 + ordered.length) % remaining.length);
        ordered.push(remaining.splice(idx, 1)[0]);
        continue;
      }

      // Score all remaining tracks
      let bestIdx = 0;
      let bestScore = -1;

      for (let i = 0; i < remaining.length; i++) {
        const djData = djDataMap.get(remaining[i].id);
        if (!djData) continue;

        const compat = calculateCompatibility(lastDjData, djData);
        // Add small random factor to avoid always picking the same
        const randomFactor = ((seed * 1000 + i) % 10) / 100;
        const score = compat.overall + randomFactor;

        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      ordered.push(remaining.splice(bestIdx, 1)[0]);
    }

    return ordered;
  }

  /**
   * Interleave tracks without DJ analysis into the ordered list
   */
  private interleave(
    orderedTracks: Track[],
    extraTracks: Track[],
    seed: number,
  ): Track[] {
    if (extraTracks.length === 0) return orderedTracks;

    const result = [...orderedTracks];
    for (let i = 0; i < extraTracks.length; i++) {
      // Insert at pseudo-random positions
      const insertIdx = Math.floor((seed * 1000 + i * 7) % (result.length + 1));
      result.splice(insertIdx, 0, extraTracks[i]);
    }
    return result;
  }

  /**
   * Regular random shuffle (fallback)
   */
  private async regularShuffle(
    seed: number,
    skip: number,
    take: number,
    total: number,
  ): Promise<GetDjShuffledTracksOutput> {
    const tracks = await this.trackRepository.findShuffledPaginated(seed, skip, take);

    return {
      data: tracks.map((t) => this.mapTrack(t)),
      total,
      seed,
      skip,
      take,
      hasMore: skip + tracks.length < total,
      djMode: false,
    };
  }

  private mapTrack(track: Track): DjShuffledTrack {
    return {
      id: track.id,
      title: track.title,
      albumId: track.albumId ?? null,
      artistId: track.artistId ?? null,
      albumArtistId: track.albumArtistId ?? null,
      trackNumber: track.trackNumber ?? null,
      discNumber: track.discNumber ?? null,
      year: track.year ?? null,
      duration: track.duration ?? null,
      path: track.path,
      bitRate: track.bitRate ?? null,
      size: track.size ?? null,
      suffix: track.suffix ?? null,
      albumName: track.albumName ?? null,
      artistName: track.artistName ?? null,
      albumArtistName: track.albumArtistName ?? null,
      compilation: track.compilation,
      rgTrackGain: track.rgTrackGain ?? null,
      rgTrackPeak: track.rgTrackPeak ?? null,
      rgAlbumGain: track.rgAlbumGain ?? null,
      rgAlbumPeak: track.rgAlbumPeak ?? null,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    };
  }
}
