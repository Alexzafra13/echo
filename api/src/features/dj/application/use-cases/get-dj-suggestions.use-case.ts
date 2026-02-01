import { Injectable } from '@nestjs/common';
import { eq, ne, and, gt } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DrizzleService } from '../../../../infrastructure/database/drizzle.service';
import { djAnalysis, tracks } from '../../../../infrastructure/database/schema';
import {
  calculateCompatibility,
  getCompatibleCamelotKeys,
  type TrackDjData,
  type CompatibilityScore,
} from '../../domain/services/dj-compatibility.service';

export interface DjSuggestion {
  trackId: string;
  title: string;
  artist: string;
  albumId: string | null;
  albumName: string | null;
  artistId: string | null;
  duration: number | null;
  bpm: number | null;
  key: string | null;
  camelotKey: string | null;
  energy: number | null;
  compatibility: CompatibilityScore;
}

export interface GetDjSuggestionsResult {
  currentTrack: {
    trackId: string;
    title: string;
    bpm: number | null;
    key: string | null;
    camelotKey: string | null;
    energy: number | null;
  };
  suggestions: DjSuggestion[];
  compatibleKeys: string[];
}

@Injectable()
export class GetDjSuggestionsUseCase {
  constructor(
    private readonly db: DrizzleService,
    @InjectPinoLogger(GetDjSuggestionsUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(
    trackId: string,
    options: {
      limit?: number;
      minScore?: number;
      prioritize?: 'bpm' | 'key' | 'energy' | 'balanced';
    } = {},
  ): Promise<GetDjSuggestionsResult | null> {
    const { limit = 10, minScore = 50, prioritize = 'balanced' } = options;

    // Get current track's DJ analysis
    const currentAnalysisResult = await this.db.db
      .select()
      .from(djAnalysis)
      .where(eq(djAnalysis.trackId, trackId))
      .limit(1);

    const currentAnalysis = currentAnalysisResult[0];

    if (!currentAnalysis) {
      this.logger.debug({ trackId }, 'No DJ analysis found for track');
      return null;
    }

    // Get current track info
    const currentTrackResult = await this.db.db
      .select({
        id: tracks.id,
        title: tracks.title,
      })
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .limit(1);

    const currentTrack = currentTrackResult[0];

    if (!currentTrack) {
      return null;
    }

    const currentDjData: TrackDjData = {
      trackId,
      bpm: currentAnalysis.bpm,
      key: currentAnalysis.key,
      camelotKey: currentAnalysis.camelotKey,
      energy: currentAnalysis.energy,
    };

    // Get compatible Camelot keys
    const compatibleKeys = currentAnalysis.camelotKey
      ? getCompatibleCamelotKeys(currentAnalysis.camelotKey)
      : [];

    // Find candidate tracks with DJ analysis
    // We get more than needed and filter by score
    const candidates = await this.db.db
      .select({
        trackId: djAnalysis.trackId,
        bpm: djAnalysis.bpm,
        key: djAnalysis.key,
        camelotKey: djAnalysis.camelotKey,
        energy: djAnalysis.energy,
        title: tracks.title,
        artistName: tracks.artistName,
        artistId: tracks.artistId,
        albumName: tracks.albumName,
        albumId: tracks.albumId,
        duration: tracks.duration,
      })
      .from(djAnalysis)
      .innerJoin(tracks, eq(tracks.id, djAnalysis.trackId))
      .where(
        and(
          ne(djAnalysis.trackId, trackId),
          eq(djAnalysis.status, 'completed'),
          // At least have BPM or key
          gt(djAnalysis.bpm, 0),
        ),
      )
      .limit(200); // Get more to filter

    // Calculate compatibility scores
    const suggestions: DjSuggestion[] = [];

    for (const candidate of candidates) {
      const candidateDjData: TrackDjData = {
        trackId: candidate.trackId,
        bpm: candidate.bpm,
        key: candidate.key,
        camelotKey: candidate.camelotKey,
        energy: candidate.energy,
      };

      const compatibility = calculateCompatibility(currentDjData, candidateDjData);

      if (compatibility.overall >= minScore) {
        suggestions.push({
          trackId: candidate.trackId,
          title: candidate.title,
          artist: candidate.artistName ?? 'Unknown Artist',
          artistId: candidate.artistId,
          albumId: candidate.albumId,
          albumName: candidate.albumName,
          duration: candidate.duration,
          bpm: candidate.bpm,
          key: candidate.key,
          camelotKey: candidate.camelotKey,
          energy: candidate.energy,
          compatibility,
        });
      }
    }

    // Sort by priority
    suggestions.sort((a, b) => {
      switch (prioritize) {
        case 'bpm':
          return b.compatibility.bpmScore - a.compatibility.bpmScore;
        case 'key':
          return b.compatibility.keyScore - a.compatibility.keyScore;
        case 'energy':
          return b.compatibility.energyScore - a.compatibility.energyScore;
        case 'balanced':
        default:
          return b.compatibility.overall - a.compatibility.overall;
      }
    });

    this.logger.debug(
      {
        trackId,
        currentBpm: currentAnalysis.bpm,
        currentKey: currentAnalysis.camelotKey,
        totalCandidates: candidates.length,
        matchingSuggestions: suggestions.length,
      },
      'Generated DJ suggestions',
    );

    return {
      currentTrack: {
        trackId,
        title: currentTrack.title,
        bpm: currentAnalysis.bpm,
        key: currentAnalysis.key,
        camelotKey: currentAnalysis.camelotKey,
        energy: currentAnalysis.energy,
      },
      suggestions: suggestions.slice(0, limit),
      compatibleKeys,
    };
  }
}
