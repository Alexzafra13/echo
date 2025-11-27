/**
 * usePlayTracking Hook
 *
 * Manages play session tracking and analytics.
 * Records play events, skips, and completion rates to backend.
 */

import { useRef, useCallback } from 'react';
import { recordPlay, recordSkip, type PlayContext } from '@shared/services/play-tracking.service';
import { logger } from '@shared/utils/logger';
import type { Track } from '../types';

interface PlaySession {
  trackId: string;
  startTime: number;
  playContext: PlayContext;
  sourceId?: string;
  sourceType?: string;
}

interface UsePlayTrackingParams {
  isShuffle: boolean;
}

export function usePlayTracking({ isShuffle }: UsePlayTrackingParams) {
  const playSessionRef = useRef<PlaySession | null>(null);

  /**
   * Determine play context based on player state
   */
  const getPlayContext = useCallback((): PlayContext => {
    if (isShuffle) {
      return 'shuffle';
    }
    return 'direct';
  }, [isShuffle]);

  /**
   * Start tracking a new play session
   */
  const startPlaySession = useCallback((track: Track, context?: PlayContext) => {
    const playContext = context || getPlayContext();

    playSessionRef.current = {
      trackId: track.id,
      startTime: Date.now(),
      playContext,
      sourceId: undefined,
      sourceType: undefined,
    };

    logger.debug('[PlayTracking] Started session:', playSessionRef.current);
  }, [getPlayContext]);

  /**
   * End current play session and record to backend
   */
  const endPlaySession = useCallback(async (
    audioElement: HTMLAudioElement | null,
    skipped: boolean = false
  ) => {
    if (!playSessionRef.current || !audioElement) return;

    const session = playSessionRef.current;
    const duration = audioElement.duration || 0;
    const currentTime = audioElement.currentTime || 0;

    // Calculate completion rate
    const completionRate = duration > 0 ? currentTime / duration : 0;

    logger.debug('[PlayTracking] Ending session:', {
      trackId: session.trackId,
      completionRate: (completionRate * 100).toFixed(1) + '%',
      skipped,
    });

    if (skipped) {
      // Record skip event
      await recordSkip({
        trackId: session.trackId,
        timeListened: currentTime,
        totalDuration: duration,
        playContext: session.playContext,
        sourceId: session.sourceId,
        sourceType: session.sourceType,
      });
    } else {
      // Record play event (only if completion > 30% or track ended naturally)
      if (completionRate >= 0.3 || completionRate >= 0.95) {
        await recordPlay({
          trackId: session.trackId,
          playContext: session.playContext,
          completionRate,
          sourceId: session.sourceId,
          sourceType: session.sourceType,
        });
      }
    }

    // Clear session
    playSessionRef.current = null;
  }, []);

  return {
    startPlaySession,
    endPlaySession,
    playSessionRef,
  };
}
