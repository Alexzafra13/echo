import { useCallback, useRef } from 'react';
import { artistsService } from '@features/artists/services/artists.service';
import { getSmartPlaylistByArtist } from '@shared/services/recommendations.service';
import type { Track } from '@shared/types/track.types';
import { logger } from '@shared/utils/logger';

const AUTOPLAY_BATCH_SIZE = 20; // Tracks to load per autoplay trigger
const MAX_ARTISTS_TO_TRY = 5; // Max similar artists to try if first ones have no tracks
const PREFETCH_THRESHOLD = 3; // Prefetch when X tracks remaining in queue

interface PrefetchedResult {
  artistId: string;
  tracks: Track[];
  sourceArtistName: string | null;
}

interface AutoplayState {
  loading: boolean;
  prefetching: boolean;
  lastArtistId: string | null;
  // Track IDs already played in this autoplay session to avoid repeats
  playedTrackIds: Set<string>;
  // Prefetched tracks ready to use
  prefetchedResult: PrefetchedResult | null;
}

/**
 * Hook for autoplay functionality
 * Loads tracks from similar artists when queue ends
 */
export function useAutoplay() {
  const stateRef = useRef<AutoplayState>({
    loading: false,
    prefetching: false,
    lastArtistId: null,
    playedTrackIds: new Set(),
    prefetchedResult: null,
  });

  /**
   * Convert recommendation track to player track format
   */
  const convertToPlayerTrack = useCallback((track: {
    id: string;
    title: string;
    artistName?: string;
    albumName?: string;
    duration?: number;
    albumId?: string;
    artistId?: string;
  }): Track => {
    return {
      id: track.id,
      title: track.title,
      artist: track.artistName || 'Artista desconocido',
      artistId: track.artistId,
      albumId: track.albumId,
      albumName: track.albumName,
      duration: track.duration,
      coverImage: track.albumId ? `/api/images/albums/${track.albumId}/cover` : undefined,
    };
  }, []);

  /**
   * Core function to fetch tracks from similar artists
   * Used by both prefetch and load functions
   */
  const fetchSimilarArtistTracks = useCallback(async (
    currentArtistId: string,
    excludeTrackIds: Set<string> = new Set(),
    isPrefetch: boolean = false
  ): Promise<{ tracks: Track[]; sourceArtistName: string | null }> => {
    const state = stateRef.current;
    const logPrefix = isPrefetch ? '[Autoplay Prefetch]' : '[Autoplay]';

    try {
      // 1. Get related artists
      logger.warn(`${logPrefix} Searching for related artists for:`, currentArtistId);
      const relatedResponse = await artistsService.getRelatedArtists(currentArtistId, MAX_ARTISTS_TO_TRY);

      logger.warn(`${logPrefix} Related artists response:`, {
        source: relatedResponse.source,
        count: relatedResponse.data?.length || 0,
        artists: relatedResponse.data?.map((a: { name: string }) => a.name) || [],
      });

      if (!relatedResponse.data || relatedResponse.data.length === 0) {
        logger.warn(`${logPrefix} No related artists found`);
        return { tracks: [], sourceArtistName: null };
      }

      // 2. Try to get tracks from similar artists (in order of match score)
      const allExcluded = new Set([...excludeTrackIds, ...state.playedTrackIds]);
      const newTracks: Track[] = [];
      let sourceArtistName: string | null = null;

      for (const relatedArtist of relatedResponse.data) {
        if (newTracks.length >= AUTOPLAY_BATCH_SIZE) break;

        try {
          const playlist = await getSmartPlaylistByArtist(
            relatedArtist.id,
            AUTOPLAY_BATCH_SIZE - newTracks.length
          );

          if (playlist.tracks && playlist.tracks.length > 0) {
            const freshTracks = playlist.tracks
              .filter(t => t.track && !allExcluded.has(t.track.id))
              .map(t => convertToPlayerTrack(t.track!));

            if (freshTracks.length > 0) {
              newTracks.push(...freshTracks);
              if (!sourceArtistName) {
                sourceArtistName = relatedArtist.name;
              }

              // Only mark as played if not prefetching (will be marked when actually used)
              if (!isPrefetch) {
                freshTracks.forEach(t => {
                  state.playedTrackIds.add(t.id);
                  allExcluded.add(t.id);
                });
              }

              logger.debug(`${logPrefix} Added ${freshTracks.length} tracks from ${relatedArtist.name}`);
            }
          }
        } catch (err) {
          logger.warn(`${logPrefix} Failed to get tracks for ${relatedArtist.name}:`, err);
        }
      }

      return { tracks: newTracks, sourceArtistName };
    } catch (error) {
      logger.error(`${logPrefix} Error:`, error);
      return { tracks: [], sourceArtistName: null };
    }
  }, [convertToPlayerTrack]);

  /**
   * Prefetch tracks from similar artists (call when nearing end of queue)
   * Runs in background and caches result for instant use later
   */
  const prefetchSimilarArtistTracks = useCallback(async (
    currentArtistId: string,
    excludeTrackIds: Set<string> = new Set()
  ): Promise<void> => {
    const state = stateRef.current;

    // Don't prefetch if already prefetching, loading, or have valid cache
    if (state.prefetching || state.loading) {
      return;
    }

    // Check if we already have prefetched data for this artist
    if (state.prefetchedResult?.artistId === currentArtistId && state.prefetchedResult.tracks.length > 0) {
      logger.debug('[Autoplay Prefetch] Already have cached tracks for this artist');
      return;
    }

    state.prefetching = true;
    logger.warn('[Autoplay Prefetch] Starting prefetch for artist:', currentArtistId);

    try {
      const result = await fetchSimilarArtistTracks(currentArtistId, excludeTrackIds, true);

      if (result.tracks.length > 0) {
        state.prefetchedResult = {
          artistId: currentArtistId,
          tracks: result.tracks,
          sourceArtistName: result.sourceArtistName,
        };
        logger.warn(`[Autoplay Prefetch] Cached ${result.tracks.length} tracks for instant playback`);
      }
    } finally {
      state.prefetching = false;
    }
  }, [fetchSimilarArtistTracks]);

  /**
   * Load tracks from similar artists
   * Uses prefetched data if available for instant response
   * @param currentArtistId - The artist ID of the last played track
   * @param excludeTrackIds - Track IDs to exclude (already in queue or played)
   * @returns Array of tracks from similar artists
   */
  const loadSimilarArtistTracks = useCallback(async (
    currentArtistId: string,
    excludeTrackIds: Set<string> = new Set()
  ): Promise<{ tracks: Track[]; sourceArtistName: string | null }> => {
    const state = stateRef.current;

    if (state.loading) {
      return { tracks: [], sourceArtistName: null };
    }

    // Check if we have prefetched data for this artist
    if (state.prefetchedResult?.artistId === currentArtistId && state.prefetchedResult.tracks.length > 0) {
      logger.warn('[Autoplay] Using prefetched tracks - instant playback!');
      const result = state.prefetchedResult;

      // Mark tracks as played
      result.tracks.forEach(t => state.playedTrackIds.add(t.id));

      // Clear cache after use
      state.prefetchedResult = null;
      state.lastArtistId = currentArtistId;

      return { tracks: result.tracks, sourceArtistName: result.sourceArtistName };
    }

    // No prefetched data, fetch now
    state.loading = true;
    logger.warn('[Autoplay] No prefetched data, fetching now...');

    try {
      const result = await fetchSimilarArtistTracks(currentArtistId, excludeTrackIds, false);
      state.lastArtistId = currentArtistId;
      return result;
    } finally {
      state.loading = false;
    }
  }, [fetchSimilarArtistTracks]);

  /**
   * Reset autoplay session (call when user starts new playback)
   */
  const resetSession = useCallback(() => {
    stateRef.current.playedTrackIds.clear();
    stateRef.current.lastArtistId = null;
    stateRef.current.prefetchedResult = null;
  }, []);

  /**
   * Check if autoplay is currently loading
   */
  const isLoading = useCallback(() => {
    return stateRef.current.loading;
  }, []);

  /**
   * Check if prefetch is in progress
   */
  const isPrefetching = useCallback(() => {
    return stateRef.current.prefetching;
  }, []);

  /**
   * Get the prefetch threshold (how many tracks before end to start prefetching)
   */
  const getPrefetchThreshold = useCallback(() => PREFETCH_THRESHOLD, []);

  return {
    loadSimilarArtistTracks,
    prefetchSimilarArtistTracks,
    resetSession,
    isLoading,
    isPrefetching,
    getPrefetchThreshold,
  };
}
