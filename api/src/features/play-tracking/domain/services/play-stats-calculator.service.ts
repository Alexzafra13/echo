import { Injectable } from '@nestjs/common';
import { PlayContext, CONTEXT_WEIGHTS } from '../entities/play-event.types';

@Injectable()
export class PlayStatsCalculatorService {
  /**
   * Calculate weighted play count based on context and completion rate
   * Formula: weight = contextWeight * completionRate
   */
  calculateWeightedPlay(playContext: PlayContext, completionRate: number): number {
    const contextWeight = CONTEXT_WEIGHTS[playContext];
    return contextWeight * completionRate;
  }

  /**
   * Determine if a play should be considered a "skip"
   * A skip is when completion rate is below threshold (50%)
   */
  isSkipped(completionRate: number, threshold: number = 0.5): boolean {
    return completionRate < threshold;
  }

  /**
   * Calculate popularity score for a track
   * Formula: (totalPlays * avgCompletionRate * (1 - skipRate)) / uniqueListeners
   */
  calculatePopularityScore(
    totalPlays: number,
    avgCompletionRate: number,
    skipRate: number,
    uniqueListeners: number,
  ): number {
    if (uniqueListeners === 0) return 0;

    const engagementScore = avgCompletionRate * (1 - skipRate);
    const normalizedPlays = totalPlays / uniqueListeners;

    return normalizedPlays * engagementScore * 100;
  }

  /**
   * Calculate average completion rate from multiple plays
   */
  calculateAvgCompletionRate(completionRates: number[]): number {
    if (completionRates.length === 0) return 0;
    const sum = completionRates.reduce((acc, rate) => acc + rate, 0);
    return sum / completionRates.length;
  }

  /**
   * Calculate skip rate (percentage of plays that were skipped)
   */
  calculateSkipRate(skipCount: number, totalPlays: number): number {
    if (totalPlays === 0) return 0;
    return skipCount / totalPlays;
  }

  /**
   * Get context weight for a specific play context
   */
  getContextWeight(playContext: PlayContext): number {
    return CONTEXT_WEIGHTS[playContext];
  }

  /**
   * Determine the most common play context from a list
   */
  getMostCommonContext(contexts: PlayContext[]): PlayContext | null {
    if (contexts.length === 0) return null;

    const contextCounts = contexts.reduce((acc, context) => {
      acc[context] = (acc[context] || 0) + 1;
      return acc;
    }, {} as Record<PlayContext, number>);

    let maxCount = 0;
    let topContext: PlayContext | null = null;

    for (const [context, count] of Object.entries(contextCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topContext = context as PlayContext;
      }
    }

    return topContext;
  }

  /**
   * Calculate listening time in minutes based on track duration and completion rate
   */
  calculateListeningTime(durationSeconds: number, completionRate: number): number {
    return (durationSeconds * completionRate) / 60;
  }
}
