import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { DjAnalysis } from '../../domain/entities/dj-analysis.entity';
import { DjStems } from '../../domain/entities/dj-stems.entity';

export type TransitionType = 'crossfade' | 'cut' | 'mashup' | 'echo_out';

export interface TransitionConfig {
  type: TransitionType;
  durationBeats: number; // 8, 16, 32
  useStems: boolean;
  stemConfig?: {
    // Which stems to use from each track
    trackA: {
      vocals: boolean;
      drums: boolean;
      bass: boolean;
      other: boolean;
    };
    trackB: {
      vocals: boolean;
      drums: boolean;
      bass: boolean;
      other: boolean;
    };
  };
}

export interface TransitionResult {
  type: TransitionType;
  startTimeA: number; // seconds into track A to start transition
  startTimeB: number; // seconds into track B to start (usually 0 or intro)
  duration: number; // transition duration in seconds
  bpmAdjustment?: number; // percentage adjustment for track B
  description: string;
}

export interface TrackCompatibility {
  trackAId: string;
  trackBId: string;
  harmonicScore: number; // 0-100
  bpmDifference: number; // percentage
  energyDifference: number; // 0-1
  overallScore: number; // 0-100
  recommendedTransition: TransitionType;
  canMashup: boolean;
}

/**
 * TransitionEngineService - Calculates and generates DJ transitions
 *
 * Features:
 * - Harmonic mixing recommendations using Camelot wheel
 * - BPM matching with tempo adjustment calculations
 * - Smart transition point detection (outro → intro)
 * - Stem-based mashup generation (when stems available)
 */
@Injectable()
export class TransitionEngineService {
  private readonly stemsDir: string;

  constructor(
    @InjectPinoLogger(TransitionEngineService.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    this.stemsDir = this.configService.get<string>(
      'DJ_STEMS_DIR',
      path.join(process.cwd(), 'data', 'stems'),
    );
  }

  /**
   * Calculate compatibility between two tracks
   */
  calculateCompatibility(
    trackA: DjAnalysis,
    trackB: DjAnalysis,
    stemsA?: DjStems,
    stemsB?: DjStems,
  ): TrackCompatibility {
    // Harmonic score
    const harmonicScore = trackA.getHarmonicScore(trackB);

    // BPM difference
    const bpmDifference =
      trackA.bpm && trackB.bpm
        ? Math.abs(trackA.bpm - trackB.bpm) / trackA.bpm * 100
        : 100;

    // Energy difference
    const energyDifference =
      trackA.energy !== undefined && trackB.energy !== undefined
        ? Math.abs(trackA.energy - trackB.energy)
        : 0.5;

    // Overall score (weighted average)
    const overallScore = Math.round(
      harmonicScore * 0.5 + // 50% harmonic
      Math.max(0, 100 - bpmDifference * 10) * 0.3 + // 30% BPM (penalize >10% difference)
      (1 - energyDifference) * 100 * 0.2 // 20% energy flow
    );

    // Determine recommended transition
    let recommendedTransition: TransitionType;
    if (harmonicScore >= 80 && bpmDifference < 6) {
      recommendedTransition = 'mashup';
    } else if (harmonicScore >= 50 && bpmDifference < 10) {
      recommendedTransition = 'crossfade';
    } else if (energyDifference > 0.5) {
      recommendedTransition = 'cut';
    } else {
      recommendedTransition = 'crossfade';
    }

    // Check if mashup is possible (both tracks have stems)
    const canMashup = !!(stemsA?.isProcessed() && stemsB?.isProcessed());

    return {
      trackAId: trackA.trackId,
      trackBId: trackB.trackId,
      harmonicScore,
      bpmDifference,
      energyDifference,
      overallScore,
      recommendedTransition: canMashup ? recommendedTransition :
        (recommendedTransition === 'mashup' ? 'crossfade' : recommendedTransition),
      canMashup,
    };
  }

  /**
   * Calculate optimal transition parameters
   */
  calculateTransition(
    trackA: DjAnalysis,
    trackB: DjAnalysis,
    config: Partial<TransitionConfig> = {},
  ): TransitionResult {
    const defaultConfig: TransitionConfig = {
      type: 'crossfade',
      durationBeats: 16,
      useStems: false,
      ...config,
    };

    // Calculate transition start time (use outro of track A)
    const startTimeA = trackA.outroStart ||
      (trackA.beatgrid?.length ? trackA.beatgrid[trackA.beatgrid.length - 1] - 30 : 0);

    // Calculate start time in track B (use intro if detected)
    const startTimeB = 0; // Start from beginning, or could use introEnd

    // Calculate duration in seconds based on BPM
    const bpm = trackA.bpm || 128;
    const beatsPerSecond = bpm / 60;
    const duration = defaultConfig.durationBeats / beatsPerSecond;

    // Calculate BPM adjustment if needed
    let bpmAdjustment: number | undefined;
    if (trackA.bpm && trackB.bpm && Math.abs(trackA.bpm - trackB.bpm) > 1) {
      bpmAdjustment = trackA.getBpmAdjustmentTo(trackB.bpm);
    }

    // Generate description
    const description = this.generateTransitionDescription(
      trackA,
      trackB,
      defaultConfig.type,
      duration,
      bpmAdjustment,
    );

    return {
      type: defaultConfig.type,
      startTimeA,
      startTimeB,
      duration,
      bpmAdjustment,
      description,
    };
  }

  /**
   * Find compatible tracks from a list
   */
  findCompatibleTracks(
    currentTrack: DjAnalysis,
    candidates: DjAnalysis[],
    options: {
      minScore?: number;
      limit?: number;
      excludeIds?: string[];
    } = {},
  ): Array<{ track: DjAnalysis; score: number }> {
    const { minScore = 50, limit = 10, excludeIds = [] } = options;

    const scored = candidates
      .filter((t) => !excludeIds.includes(t.trackId))
      .map((track) => ({
        track,
        score: currentTrack.getHarmonicScore(track) * 0.6 +
          (currentTrack.isBpmCompatibleWith(track) ? 40 : 0),
      }))
      .filter((item) => item.score >= minScore)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  }

  /**
   * Generate stem-based mashup transition points
   */
  calculateMashupTransition(
    trackA: DjAnalysis,
    trackB: DjAnalysis,
    _stemsA: DjStems,
    _stemsB: DjStems,
    durationBeats = 32,
  ): {
    timeline: Array<{
      beat: number;
      stemChanges: {
        vocals: 'A' | 'B' | 'both' | 'none';
        drums: 'A' | 'B' | 'both' | 'none';
        bass: 'A' | 'B' | 'both' | 'none';
        other: 'A' | 'B' | 'both' | 'none';
      };
    }>;
    description: string;
  } {
    // Generate a smooth stem transition timeline
    const timeline: Array<{
      beat: number;
      stemChanges: {
        vocals: 'A' | 'B' | 'both' | 'none';
        drums: 'A' | 'B' | 'both' | 'none';
        bass: 'A' | 'B' | 'both' | 'none';
        other: 'A' | 'B' | 'both' | 'none';
      };
    }> = [];

    // Beat 0: Full track A
    timeline.push({
      beat: 0,
      stemChanges: {
        vocals: 'A',
        drums: 'A',
        bass: 'A',
        other: 'A',
      },
    });

    // Beat 8: Drums swap to B
    timeline.push({
      beat: 8,
      stemChanges: {
        vocals: 'A',
        drums: 'B',
        bass: 'A',
        other: 'A',
      },
    });

    // Beat 16: Bass swaps to B
    timeline.push({
      beat: 16,
      stemChanges: {
        vocals: 'A',
        drums: 'B',
        bass: 'B',
        other: 'both',
      },
    });

    // Beat 24: Vocals fade
    timeline.push({
      beat: 24,
      stemChanges: {
        vocals: 'both',
        drums: 'B',
        bass: 'B',
        other: 'B',
      },
    });

    // Beat 32: Full track B
    timeline.push({
      beat: durationBeats,
      stemChanges: {
        vocals: 'B',
        drums: 'B',
        bass: 'B',
        other: 'B',
      },
    });

    const bpm = trackA.bpm || 128;
    const durationSec = (durationBeats / bpm) * 60;

    return {
      timeline,
      description: `Mashup transition over ${durationBeats} beats (${durationSec.toFixed(1)}s): ` +
        `Drums swap at beat 8, bass at beat 16, vocals blend at beat 24`,
    };
  }

  private generateTransitionDescription(
    trackA: DjAnalysis,
    trackB: DjAnalysis,
    type: TransitionType,
    duration: number,
    bpmAdjustment?: number,
  ): string {
    const parts: string[] = [];

    parts.push(`${type.toUpperCase()} transition (${duration.toFixed(1)}s)`);

    if (trackA.camelotKey && trackB.camelotKey) {
      parts.push(`Key: ${trackA.camelotKey} → ${trackB.camelotKey}`);
    }

    if (trackA.bpm && trackB.bpm) {
      parts.push(`BPM: ${trackA.bpm} → ${trackB.bpm}`);
      if (bpmAdjustment) {
        parts.push(`(adjust ${bpmAdjustment > 0 ? '+' : ''}${bpmAdjustment.toFixed(1)}%)`);
      }
    }

    return parts.join(' | ');
  }
}
