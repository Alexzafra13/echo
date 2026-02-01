import { useCallback, useRef } from 'react';
import { djService } from '@features/dj/services/dj.service';
import type { Track } from '@shared/types/track.types';
import { logger } from '@shared/utils/logger';

interface DjAutoQueueState {
  loading: boolean;
  // Track IDs already queued in this session to avoid repeats
  queuedTrackIds: Set<string>;
}

/**
 * Hook for DJ auto-queue functionality
 * Fetches compatible tracks based on BPM, Key, and Energy
 */
export function useDjAutoQueue() {
  const stateRef = useRef<DjAutoQueueState>({
    loading: false,
    queuedTrackIds: new Set(),
  });

  /**
   * Convert DJ suggestion to player track format
   */
  const convertToPlayerTrack = useCallback((suggestion: {
    trackId: string;
    title: string;
    artist: string;
    albumId?: string | null;
    albumName?: string | null;
    duration?: number | null;
    artistId?: string | null;
    bpm?: number | null;
    camelotKey?: string | null;
    energy?: number | null;
    compatibility: {
      overall: number;
      bpmScore: number;
      keyScore: number;
      energyScore: number;
    };
  }): Track => {
    return {
      id: suggestion.trackId,
      title: suggestion.title,
      artist: suggestion.artist,
      artistId: suggestion.artistId ?? undefined,
      albumId: suggestion.albumId ?? undefined,
      albumName: suggestion.albumName ?? undefined,
      duration: suggestion.duration ?? undefined,
      coverImage: suggestion.albumId ? `/api/images/albums/${suggestion.albumId}/cover` : undefined,
      // Mark as added by DJ auto-queue
      addedByDj: true,
      djInfo: {
        bpm: suggestion.bpm ?? undefined,
        musicalKey: suggestion.camelotKey ?? undefined,
        energy: suggestion.energy ?? undefined,
        compatibilityScore: suggestion.compatibility.overall,
      },
    };
  }, []);

  /**
   * Get the next compatible track for DJ mixing
   * @param currentTrackId - The ID of the current playing track
   * @param excludeTrackIds - Track IDs to exclude (already in queue)
   * @returns The best compatible track or null
   */
  const getNextCompatibleTrack = useCallback(async (
    currentTrackId: string,
    excludeTrackIds: Set<string> = new Set()
  ): Promise<Track | null> => {
    const state = stateRef.current;

    if (state.loading) {
      logger.debug('[DJ AutoQueue] Already loading, skipping');
      return null;
    }

    state.loading = true;
    logger.debug('[DJ AutoQueue] Fetching compatible tracks for:', currentTrackId);

    try {
      const result = await djService.getSuggestions(currentTrackId, {
        limit: 10,
        minScore: 60,
        prioritize: 'balanced',
      });

      if (!result.suggestions || result.suggestions.length === 0) {
        logger.debug('[DJ AutoQueue] No compatible tracks found');
        return null;
      }

      // Filter out excluded tracks and already queued tracks
      const allExcluded = new Set([...excludeTrackIds, ...state.queuedTrackIds]);
      const availableSuggestions = result.suggestions.filter(
        s => !allExcluded.has(s.trackId)
      );

      if (availableSuggestions.length === 0) {
        logger.debug('[DJ AutoQueue] All compatible tracks already in queue or excluded');
        return null;
      }

      // Pick the best match (first one, already sorted by score)
      const bestMatch = availableSuggestions[0];
      state.queuedTrackIds.add(bestMatch.trackId);

      logger.debug('[DJ AutoQueue] Selected track:', {
        title: bestMatch.title,
        score: bestMatch.compatibility.overall,
        bpm: bestMatch.bpm,
        key: bestMatch.camelotKey,
      });

      return convertToPlayerTrack(bestMatch);
    } catch (error) {
      logger.error('[DJ AutoQueue] Error fetching suggestions:', error);
      return null;
    } finally {
      state.loading = false;
    }
  }, [convertToPlayerTrack]);

  /**
   * Reset DJ auto-queue session (call when user starts new playback)
   */
  const resetSession = useCallback(() => {
    stateRef.current.queuedTrackIds.clear();
    logger.debug('[DJ AutoQueue] Session reset');
  }, []);

  /**
   * Check if DJ auto-queue is currently loading
   */
  const isLoading = useCallback(() => {
    return stateRef.current.loading;
  }, []);

  return {
    getNextCompatibleTrack,
    resetSession,
    isLoading,
  };
}
