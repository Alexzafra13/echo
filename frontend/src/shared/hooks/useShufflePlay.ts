import { useState, useCallback, useRef, useEffect } from 'react';
import { usePlayer } from '@features/player';
import { tracksService, type ShuffledTracksResponse } from '@features/home/services/tracks.service';
import type { Track } from '@shared/types/track.types';
import { logger } from '@shared/utils/logger';

/** Tracks to load per batch */
const BATCH_SIZE = 50;
/** Load more when queue has fewer tracks remaining */
const PREFETCH_THRESHOLD = 10;

interface ShuffleState {
  seed: number | null;
  skip: number;
  total: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export interface UseShufflePlayReturn {
  /** Execute shuffle play for entire library */
  shufflePlay: () => Promise<void>;
  /** Loading state while fetching initial tracks */
  isLoading: boolean;
  /** Load more tracks to the queue (for prefetching) */
  loadMoreTracks: () => Promise<void>;
  /** Whether more tracks are available */
  hasMore: boolean;
  /** Whether currently loading more tracks */
  isLoadingMore: boolean;
}

/**
 * Converts home track format to player format
 */
function convertToPlayerTrack(track: import('@features/home/types').Track): Track {
  return {
    id: track.id,
    title: track.title,
    artist: track.artistName || 'Artista desconocido',
    artistId: track.artistId,
    albumId: track.albumId,
    albumName: track.albumName,
    duration: track.duration,
    coverImage: track.albumId ? `/api/images/albums/${track.albumId}/cover` : undefined,
    trackNumber: track.trackNumber,
    discNumber: track.discNumber,
  };
}

/**
 * Hook for playing the entire library in shuffle mode
 * Fetches tracks in batches for better performance with large libraries
 */
export function useShufflePlay(): UseShufflePlayReturn {
  const { playQueue, addToQueue, queue, isShuffle, toggleShuffle } = usePlayer();
  const [isLoading, setIsLoading] = useState(false);

  // Track shuffle state across renders
  const shuffleStateRef = useRef<ShuffleState>({
    seed: null,
    skip: 0,
    total: 0,
    hasMore: false,
    isLoadingMore: false,
  });

  // Expose hasMore and isLoadingMore as reactive state
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  /**
   * Load more tracks using the same seed to continue the shuffle sequence
   */
  const loadMoreTracks = useCallback(async () => {
    const state = shuffleStateRef.current;

    // Don't load if already loading or no more tracks
    if (state.isLoadingMore || !state.hasMore || state.seed === null) {
      return;
    }

    state.isLoadingMore = true;
    setIsLoadingMore(true);

    try {
      const response: ShuffledTracksResponse = await tracksService.getShuffled({
        seed: state.seed,
        skip: state.skip,
        take: BATCH_SIZE,
      });

      if (response.data.length > 0) {
        const playerTracks = response.data.map(convertToPlayerTrack);
        addToQueue(playerTracks);

        // Update state
        state.skip += response.data.length;
        state.hasMore = response.hasMore;
        setHasMore(response.hasMore);

        logger.debug('[ShufflePlay] Loaded more tracks:', {
          loaded: response.data.length,
          total: state.skip,
          hasMore: response.hasMore,
        });
      } else {
        state.hasMore = false;
        setHasMore(false);
      }
    } catch (error) {
      logger.error('[ShufflePlay] Error loading more tracks:', error);
    } finally {
      state.isLoadingMore = false;
      setIsLoadingMore(false);
    }
  }, [addToQueue]);

  /**
   * Start shuffle playback with a fresh batch of tracks
   */
  const shufflePlay = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      // Get initial batch (no seed = generate new random sequence)
      const response: ShuffledTracksResponse = await tracksService.getShuffled({
        take: BATCH_SIZE,
      });

      if (response.data.length === 0) {
        logger.warn('[ShufflePlay] No tracks available');
        return;
      }

      // Store shuffle state for pagination
      shuffleStateRef.current = {
        seed: response.seed,
        skip: response.data.length,
        total: response.total,
        hasMore: response.hasMore,
        isLoadingMore: false,
      };
      setHasMore(response.hasMore);

      // Convert to player format
      const playerTracks = response.data.map(convertToPlayerTrack);

      // Enable shuffle mode if not already enabled
      if (!isShuffle) {
        toggleShuffle();
      }

      // Start playback
      playQueue(playerTracks, 0);

      logger.debug('[ShufflePlay] Started shuffle play:', {
        seed: response.seed,
        loaded: response.data.length,
        total: response.total,
        hasMore: response.hasMore,
      });
    } catch (error) {
      logger.error('[ShufflePlay] Error starting shuffle play:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isShuffle, toggleShuffle, playQueue]);

  // Auto-prefetch more tracks when queue is running low
  useEffect(() => {
    const state = shuffleStateRef.current;

    // Only prefetch if:
    // - We have a seed (shuffle is active)
    // - There are more tracks to load
    // - Not already loading
    // - Queue is running low
    if (
      state.seed !== null &&
      state.hasMore &&
      !state.isLoadingMore &&
      queue.length > 0
    ) {
      // Calculate remaining tracks in queue
      // This is a simplified check - ideally we'd know the current index
      const remainingEstimate = queue.length;

      if (remainingEstimate <= PREFETCH_THRESHOLD) {
        logger.debug('[ShufflePlay] Queue running low, prefetching more tracks');
        loadMoreTracks();
      }
    }
  }, [queue.length, loadMoreTracks]);

  return {
    shufflePlay,
    isLoading,
    loadMoreTracks,
    hasMore,
    isLoadingMore,
  };
}
