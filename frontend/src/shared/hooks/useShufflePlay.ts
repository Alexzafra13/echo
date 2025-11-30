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

const BATCH_SIZE = 50;
const PREFETCH_THRESHOLD = 10;

export interface UseShufflePlayReturn {
  shufflePlay: () => Promise<void>;
  isLoading: boolean;
  loadMoreTracks: () => Promise<void>;
  hasMore: boolean;
}

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

export function useShufflePlay(): UseShufflePlayReturn {
  const { playQueue, addToQueue, queue, isShuffle, toggleShuffle } = usePlayer();
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const shuffleRef = useRef<{ seed: number | null; skip: number; loading: boolean }>({
    seed: null,
    skip: 0,
    loading: false,
  });

  const loadMoreTracks = useCallback(async () => {
    const state = shuffleRef.current;
    if (state.loading || !hasMore || state.seed === null) return;

    state.loading = true;
    try {
      const response = await tracksService.getShuffled({
        seed: state.seed,
        skip: state.skip,
        take: BATCH_SIZE,
      });

      if (response.data.length > 0) {
        addToQueue(response.data.map(convertToPlayerTrack));
        state.skip += response.data.length;
        setHasMore(response.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('[ShufflePlay] Error loading more:', error);
    } finally {
      state.loading = false;
    }
  }, [addToQueue, hasMore]);

  const shufflePlay = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await tracksService.getShuffled({ take: BATCH_SIZE });
      if (response.data.length === 0) return;

      shuffleRef.current = { seed: response.seed, skip: response.data.length, loading: false };
      setHasMore(response.hasMore);

      if (!isShuffle) toggleShuffle();
      playQueue(response.data.map(convertToPlayerTrack), 0);
    } catch (error) {
      console.error('[ShufflePlay] Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isShuffle, toggleShuffle, playQueue]);

  // Auto-prefetch when queue is low
  useEffect(() => {
    if (shuffleRef.current.seed && hasMore && !shuffleRef.current.loading && queue.length <= PREFETCH_THRESHOLD) {
      loadMoreTracks();
    }
  }, [queue.length, hasMore, loadMoreTracks]);

  return { shufflePlay, isLoading, loadMoreTracks, hasMore };
}
