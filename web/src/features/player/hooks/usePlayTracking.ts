/**
 * usePlayTracking Hook
 *
 * Manages play session tracking and analytics.
 * Records play events, skips, and completion rates to backend.
 */

import { useRef, useCallback } from 'react';
import { recordPlay, recordSkip, type PlayContext, type SourceType } from '@shared/services/play-tracking.service';
import { logger } from '@shared/utils/logger';
import type { Track } from '../types';
import type { AudioElements } from './useAudioElements';

interface PlaySession {
  trackId: string;
  startTime: number;
  playContext: PlayContext;
  sourceId?: string;
  sourceType?: SourceType;
}

interface UsePlayTrackingParams {
  audioElements: AudioElements;
  isShuffle: boolean;
}

export function usePlayTracking({ audioElements, isShuffle }: UsePlayTrackingParams) {
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
   * Set source information for current session
   */
  const setSessionSource = useCallback((sourceId: string, sourceType: SourceType) => {
    if (playSessionRef.current) {
      playSessionRef.current.sourceId = sourceId;
      playSessionRef.current.sourceType = sourceType;
    }
  }, []);

  /**
   * End current play session and record to backend
   */
  const endPlaySession = useCallback(async (skipped: boolean = false) => {
    if (!playSessionRef.current) return;

    const session = playSessionRef.current;
    const duration = audioElements.getDuration();
    const currentTime = audioElements.getCurrentTime();

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
      // Record play event only if meaningful playback occurred:
      // - Track was played for at least 30% of its duration, OR
      // - Track ended naturally (completion >= 95%)
      if (completionRate >= 0.3) {
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
  }, [audioElements]);

  /**
   * Check if there's an active play session
   */
  const hasActiveSession = useCallback((): boolean => {
    return playSessionRef.current !== null;
  }, []);

  /**
   * Get current session track ID
   */
  const getCurrentSessionTrackId = useCallback((): string | null => {
    return playSessionRef.current?.trackId || null;
  }, []);

  return {
    startPlaySession,
    endPlaySession,
    setSessionSource,
    hasActiveSession,
    getCurrentSessionTrackId,
    playSessionRef,
  };
}

export type PlayTracking = ReturnType<typeof usePlayTracking>;
