import { useState, useCallback, useRef, useEffect } from 'react';
import { usePlayer } from '@features/player';
import { tracksService } from '@features/home/services/tracks.service';
import type { Track } from '@shared/types/track.types';

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
    // Audio normalization data (LUFS)
    rgTrackGain: track.rgTrackGain,
    rgTrackPeak: track.rgTrackPeak,
  };
}

export function useShufflePlay(): UseShufflePlayReturn {
  const { playQueue, addToQueue, queue, isShuffle, toggleShuffle } = usePlayer();
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const shuffleRef = useRef<{ seed: number | null; skip: number; loading: boolean; queueIds: Set<string> }>({
    seed: null,
    skip: 0,
    loading: false,
    queueIds: new Set(),
  });

  // Detect when queue has been completely replaced (not by shuffle)
  // and clear the shuffle state to prevent auto-loading more shuffle tracks
  useEffect(() => {
    const state = shuffleRef.current;
    if (!state.seed || queue.length === 0) return;

    // Check if current queue is from our shuffle session
    const currentIds = new Set(queue.map(t => t.id));
    const hasOverlap = [...state.queueIds].some(id => currentIds.has(id));

    // If no overlap, queue was completely replaced - clear shuffle state
    if (!hasOverlap && state.queueIds.size > 0) {
      state.seed = null;
      state.skip = 0;
      state.queueIds = new Set();
      setHasMore(false);
    }
  }, [queue]);

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
        const tracks = response.data.map(convertToPlayerTrack);
        // Track IDs from this shuffle session
        tracks.forEach(t => state.queueIds.add(t.id));
        addToQueue(tracks);
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

      const tracks = response.data.map(convertToPlayerTrack);
      const queueIds = new Set(tracks.map(t => t.id));

      shuffleRef.current = { seed: response.seed, skip: response.data.length, loading: false, queueIds };
      setHasMore(response.hasMore);

      if (!isShuffle) toggleShuffle();
      playQueue(tracks, 0);
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
