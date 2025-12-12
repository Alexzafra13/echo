import { Injectable, Inject } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import {
  TrackScore,
  ScoreBreakdown,
  SCORING_WEIGHTS,
  FEEDBACK_SCORES,
  RECENCY_DECAY,
} from '../entities/track-score.types';
import {
  IUserInteractionsRepository,
  USER_INTERACTIONS_REPOSITORY,
} from '@features/user-interactions/domain/ports';
import {
  IPlayTrackingRepository,
  PLAY_TRACKING_REPOSITORY,
} from '@features/play-tracking/domain/ports';

@Injectable()
export class ScoringService {
  constructor(
    @InjectPinoLogger(ScoringService.name)
    private readonly logger: PinoLogger,
    @Inject(USER_INTERACTIONS_REPOSITORY)
    private readonly interactionsRepo: IUserInteractionsRepository,
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly playTrackingRepo: IPlayTrackingRepository,
  ) {}

  /**
   * Calculate total score for a track
   * Formula: totalScore = (explicitFeedback * 0.45) + (implicitBehavior * 0.35) + (recency * 0.15) + (diversity * 0.05)
   */
  calculateTrackScore(
    explicitFeedback: number,
    implicitBehavior: number,
    recency: number,
    diversity: number,
  ): number {
    const weighted =
      explicitFeedback * SCORING_WEIGHTS.explicitFeedback +
      implicitBehavior * SCORING_WEIGHTS.implicitBehavior +
      recency * SCORING_WEIGHTS.recency +
      diversity * SCORING_WEIGHTS.diversity;

    // Clamp between -100 and 100
    return Math.max(-100, Math.min(100, weighted));
  }

  /**
   * Calculate explicit feedback score (0-100 points)
   * Based on likes/dislikes and ratings
   */
  calculateExplicitFeedback(sentiment?: 'like' | 'dislike', rating?: number): number {
    let score = 0;

    // Sentiment score
    if (sentiment === 'like') {
      score += FEEDBACK_SCORES.like;
    } else if (sentiment === 'dislike') {
      score += FEEDBACK_SCORES.dislike;
    }

    // Rating score (1-5 stars → 12-60 points)
    if (rating !== undefined && rating > 0) {
      score += rating * FEEDBACK_SCORES.ratingMultiplier;
    }

    // Normalize to 0-100 range
    // Max possible: 40 (like) + 60 (5 stars) = 100
    // Min possible: -40 (dislike) + 12 (1 star) = -28
    return Math.max(-100, Math.min(100, score));
  }

  /**
   * Calculate implicit behavior score (0-100 points)
   * Based on play count, completion rate, and context
   */
  calculateImplicitBehavior(
    weightedPlayCount: number,
    avgCompletionRate: number,
    playCount: number,
  ): number {
    // Weight: 70% from weighted play count, 30% from completion rate
    const weightedCountScore = Math.min(weightedPlayCount * 5, 70); // Cap at 70
    const completionScore = avgCompletionRate * 30; // 0-30 points

    const score = weightedCountScore + completionScore;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate recency score (0-100 points)
   * Exponential decay: score = 100 * e^(-lambda * days)
   */
  calculateRecency(lastPlayedAt?: Date | string): number {
    if (!lastPlayedAt) {
      return 0;
    }

    // Convert to Date if it's a string (can happen when data comes from Redis/database)
    const lastPlayedDate = typeof lastPlayedAt === 'string' ? new Date(lastPlayedAt) : lastPlayedAt;

    const now = new Date();
    const daysSinceLastPlay = (now.getTime() - lastPlayedDate.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay
    const score = 100 * Math.exp(-RECENCY_DECAY.lambda * daysSinceLastPlay);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate diversity score (0-100 points)
   * Penalize over-concentration on same artist/album
   */
  calculateDiversity(artistPlayCount: number, totalPlayCount: number): number {
    if (totalPlayCount === 0) {
      return 100;
    }

    const artistSaturation = artistPlayCount / totalPlayCount;

    // Inverse score - lower saturation = higher diversity
    const score = 100 * (1 - artistSaturation);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate comprehensive score breakdown for a track
   */
  async calculateScoreBreakdown(
    userId: string,
    trackId: string,
    trackArtistId?: string,
  ): Promise<ScoreBreakdown> {
    // Get interaction data
    const interaction = await this.interactionsRepo.getItemInteractionSummary(trackId, 'track', userId);

    // Get play stats
    const playStats = await this.playTrackingRepo.getUserPlayStats(userId, 'track');
    const trackStats = playStats.find((s) => s.itemId === trackId);

    if (!trackStats) {
      this.logger.debug({ userId, trackId }, 'No play stats found for track');
    }

    // Get artist play stats for diversity calculation
    let artistPlayCount = 0;
    const totalPlayCount = playStats.reduce((sum, s) => sum + s.playCount, 0);

    if (trackArtistId) {
      const artistStats = await this.playTrackingRepo.getUserPlayStats(userId, 'artist');
      const artistStat = artistStats.find((s) => s.itemId === trackArtistId);
      artistPlayCount = artistStat ? artistStat.playCount : 0;
    }

    // Calculate each component
    const explicitFeedback = this.calculateExplicitFeedback(interaction.userSentiment, interaction.userRating);

    const implicitBehavior = trackStats
      ? this.calculateImplicitBehavior(
          trackStats.weightedPlayCount,
          trackStats.avgCompletionRate || 0,
          trackStats.playCount,
        )
      : 0;

    const recency = this.calculateRecency(trackStats?.lastPlayedAt);

    const diversity = this.calculateDiversity(artistPlayCount, totalPlayCount);

    return {
      explicitFeedback,
      implicitBehavior,
      recency,
      diversity,
    };
  }

  /**
   * Calculate full track score with breakdown
   */
  async calculateFullTrackScore(
    userId: string,
    trackId: string,
    trackArtistId?: string,
  ): Promise<TrackScore> {
    const breakdown = await this.calculateScoreBreakdown(userId, trackId, trackArtistId);

    const totalScore = this.calculateTrackScore(
      breakdown.explicitFeedback,
      breakdown.implicitBehavior,
      breakdown.recency,
      breakdown.diversity,
    );

    return {
      trackId,
      totalScore,
      breakdown,
      rank: 0, // Will be set when ranking multiple tracks
    };
  }

  /**
   * Calculate scores for multiple tracks and rank them
   */
  async calculateAndRankTracks(
    userId: string,
    trackIds: string[],
    trackArtistMap?: Map<string, string>,
  ): Promise<TrackScore[]> {
    // Calculate scores for all tracks
    const scorePromises = trackIds.map((trackId) =>
      this.calculateFullTrackScore(userId, trackId, trackArtistMap?.get(trackId)),
    );

    const scores = await Promise.all(scorePromises);

    // Sort by total score descending
    scores.sort((a, b) => b.totalScore - a.totalScore);

    // Assign ranks
    scores.forEach((score, index) => {
      score.rank = index + 1;
    });

    return scores;
  }
}
