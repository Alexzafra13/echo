import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IPlaylistRepository, PLAYLIST_REPOSITORY, TrackWithPlaylistOrder } from '../../ports';
import {
  IDjAnalysisRepository,
  DJ_ANALYSIS_REPOSITORY,
} from '@features/dj/domain/ports/dj-analysis.repository.port';
import {
  calculateCompatibility,
  TrackDjData,
} from '@features/dj/domain/services/dj-compatibility.service';
import {
  GetPlaylistDjShuffledTracksInput,
  GetPlaylistDjShuffledTracksOutput,
  PlaylistDjShuffledTrackItem,
} from './get-playlist-dj-shuffled-tracks.dto';

const MIN_DJ_COVERAGE = 0.5; // 50% of tracks must have DJ analysis

@Injectable()
export class GetPlaylistDjShuffledTracksUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
    @Inject(DJ_ANALYSIS_REPOSITORY)
    private readonly djAnalysisRepo: IDjAnalysisRepository
  ) {}

  async execute(
    input: GetPlaylistDjShuffledTracksInput
  ): Promise<GetPlaylistDjShuffledTracksOutput> {
    if (!input.playlistId || input.playlistId.trim() === '') {
      throw new ValidationError('Playlist ID is required');
    }

    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new NotFoundError('Playlist', input.playlistId);
    }

    // Verify access: only owner or public playlists
    if (!playlist.public && input.requesterId && playlist.ownerId !== input.requesterId) {
      throw new ForbiddenError('You do not have access to this playlist');
    }

    const seed = input.seed ?? Math.random();
    const tracks = await this.playlistRepository.getPlaylistTracks(input.playlistId);

    if (tracks.length === 0) {
      return {
        playlistId: playlist.id,
        playlistName: playlist.name,
        tracks: [],
        total: 0,
        seed,
        djMode: false,
      };
    }

    // Try DJ-aware ordering
    const djResult = await this.tryDjShuffle(tracks, seed);

    if (djResult) {
      return {
        playlistId: playlist.id,
        playlistName: playlist.name,
        tracks: djResult,
        total: tracks.length,
        seed,
        djMode: true,
      };
    }

    // Fallback: Fisher-Yates shuffle with seed for determinism
    const shuffled = this.seededShuffle([...tracks], seed);
    return {
      playlistId: playlist.id,
      playlistName: playlist.name,
      tracks: shuffled.map((t) => this.mapTrack(t)),
      total: tracks.length,
      seed,
      djMode: false,
    };
  }

  /**
   * Attempt DJ-aware shuffle using harmonic compatibility.
   * Returns null if not enough tracks have DJ analysis.
   */
  private async tryDjShuffle(
    tracks: TrackWithPlaylistOrder[],
    seed: number
  ): Promise<PlaylistDjShuffledTrackItem[] | null> {
    const trackIds = tracks.map((t) => t.id);
    const analyses = await this.djAnalysisRepo.findByTrackIds(trackIds);

    // Check coverage
    const completedAnalyses = analyses.filter((a) => a.status === 'completed');
    if (completedAnalyses.length < tracks.length * MIN_DJ_COVERAGE) {
      return null;
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
    const tracksWithDj = tracks.filter((t) => djDataMap.has(t.id));
    const tracksWithoutDj = tracks.filter((t) => !djDataMap.has(t.id));

    // Order tracks by harmonic compatibility
    const ordered = this.orderByCompatibility(tracksWithDj, djDataMap, seed);

    // Interleave tracks without DJ analysis
    const final = this.interleave(ordered, tracksWithoutDj, seed);

    return final.map((t) => this.mapTrack(t, djDataMap));
  }

  /**
   * Order tracks by harmonic compatibility using DJ analysis
   */
  private orderByCompatibility(
    tracks: TrackWithPlaylistOrder[],
    djDataMap: Map<string, TrackDjData>,
    seed: number
  ): TrackWithPlaylistOrder[] {
    if (tracks.length <= 1) return tracks;

    const ordered: TrackWithPlaylistOrder[] = [];
    const remaining = [...tracks];

    // Start with a deterministic random track based on seed
    const startIdx = Math.floor(seed * remaining.length);
    ordered.push(remaining.splice(startIdx, 1)[0]);

    // Build chain by selecting most compatible next track
    while (remaining.length > 0) {
      const lastTrack = ordered[ordered.length - 1];
      const lastDjData = djDataMap.get(lastTrack.id);

      if (!lastDjData) {
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
    orderedTracks: TrackWithPlaylistOrder[],
    extraTracks: TrackWithPlaylistOrder[],
    seed: number
  ): TrackWithPlaylistOrder[] {
    if (extraTracks.length === 0) return orderedTracks;

    const result = [...orderedTracks];
    for (let i = 0; i < extraTracks.length; i++) {
      const insertIdx = Math.floor((seed * 1000 + i * 7) % (result.length + 1));
      result.splice(insertIdx, 0, extraTracks[i]);
    }
    return result;
  }

  /**
   * Deterministic Fisher-Yates shuffle using seed
   */
  private seededShuffle<T>(arr: T[], seed: number): T[] {
    let s = seed;
    for (let i = arr.length - 1; i > 0; i--) {
      // Simple seeded pseudo-random
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private mapTrack(
    track: TrackWithPlaylistOrder,
    djDataMap?: Map<string, TrackDjData>
  ): PlaylistDjShuffledTrackItem {
    // Prefer DJ analysis BPM over ID3 tag BPM
    const djBpm = djDataMap?.get(track.id)?.bpm;
    return {
      id: track.id,
      title: track.title,
      trackNumber: track.trackNumber,
      discNumber: track.discNumber,
      year: track.year,
      duration: track.duration ?? 0,
      size: track.size !== null && track.size !== undefined ? track.size : Number(0),
      path: track.path,
      albumId: track.albumId,
      artistId: track.artistId,
      bitRate: track.bitRate,
      suffix: track.suffix,
      artistName: track.artistName,
      albumName: track.albumName,
      rgTrackGain: track.rgTrackGain,
      rgTrackPeak: track.rgTrackPeak,
      rgAlbumGain: track.rgAlbumGain,
      rgAlbumPeak: track.rgAlbumPeak,
      outroStart: track.outroStart,
      bpm: djBpm ?? track.bpm,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    };
  }
}
