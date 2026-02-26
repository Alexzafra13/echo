/**
 * usePlayTracking Hook
 *
 * Manages play session tracking and analytics.
 * Records play events, skips, and completion rates to backend.
 */

import { useRef, useCallback } from 'react';
import {
  recordPlay,
  recordSkip,
  type PlayContext,
  type SourceType,
} from '@shared/services/play-tracking.service';
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
  isAutoplayActive: boolean;
}

export function usePlayTracking({
  audioElements,
  isShuffle,
  isAutoplayActive,
}: UsePlayTrackingParams) {
  const playSessionRef = useRef<PlaySession | null>(null);

  /**
   * Determine play context based on player state.
   * This feeds into the context weight system used by the scoring algorithm:
   *   direct: 1.0, search: 0.9, playlist: 0.8, artist: 0.75,
   *   queue: 0.7, recommendation: 0.7, album: 0.6, radio: 0.4, shuffle: 0.2
   */
  const getPlayContext = useCallback((): PlayContext => {
    if (isShuffle) {
      return 'shuffle';
    }
    if (isAutoplayActive) {
      return 'recommendation';
    }
    return 'direct';
  }, [isShuffle, isAutoplayActive]);

  /**
   * Start tracking a new play session
   */
  const startPlaySession = useCallback(
    (track: Track, context?: PlayContext) => {
      // Shuffle mode always wins because it fundamentally changes the play intent
      // (weight: 0.2 vs e.g. album: 0.6). Otherwise use the explicit context
      // from the originating UI (album page, playlist, search, etc.)
      const playContext = isShuffle ? 'shuffle' : context || getPlayContext();

      playSessionRef.current = {
        trackId: track.id,
        startTime: Date.now(),
        playContext,
        sourceId: undefined,
        sourceType: undefined,
      };

      logger.debug('[PlayTracking] Started session:', playSessionRef.current);
    },
    [isShuffle, getPlayContext]
  );

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
  const endPlaySession = useCallback(
    async (skipped: boolean = false) => {
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
        // Record skip event — also updates aggregated stats (skipCount, etc.)
        await recordSkip({
          trackId: session.trackId,
          timeListened: currentTime,
          totalDuration: duration,
          playContext: session.playContext,
          sourceId: session.sourceId,
          sourceType: session.sourceType,
        });
      } else {
        // Record play event if user listened to a meaningful portion (>= 30%).
        // Tracks that end naturally via crossfade or normal playback will always
        // have high completion (80-100%), so this threshold only filters out
        // edge cases like interrupted loads.
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
    },
    [audioElements]
  );

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
