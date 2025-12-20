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

interface ShuffleState {
  seed: number | null;
  skip: number;
  loading: boolean;
  queueIds: Set<string>;
  // IDs of all tracks that have been added to queue in this shuffle session
  // Used to avoid duplicates when loading more tracks
  seenTrackIds: Set<string>;
  // Total tracks available in the library
  totalTracks: number;
}

export function useShufflePlay(): UseShufflePlayReturn {
  const { playQueue, addToQueue, queue, currentIndex, isShuffle, toggleShuffle } = usePlayer();
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const shuffleRef = useRef<ShuffleState>({
    seed: null,
    skip: 0,
    loading: false,
    queueIds: new Set(),
    seenTrackIds: new Set(),
    totalTracks: 0,
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
      // Keep seenTrackIds to avoid duplicates even after queue replacement
      // Only reset when user explicitly starts a new shuffle session
      setHasMore(false);
    }
  }, [queue]);

  const loadMoreTracks = useCallback(async () => {
    const state = shuffleRef.current;
    if (state.loading || !hasMore || state.seed === null) return;

    state.loading = true;
    try {
      // We may need to fetch more batches if many tracks are filtered as duplicates
      const newTracks: Track[] = [];
      let attempts = 0;
      const maxAttempts = 5; // Prevent infinite loops

      while (newTracks.length < BATCH_SIZE && attempts < maxAttempts) {
        const response = await tracksService.getShuffled({
          seed: state.seed,
          skip: state.skip,
          take: BATCH_SIZE,
        });

        state.totalTracks = response.total;

        if (response.data.length === 0) {
          // No more tracks from backend
          break;
        }

        const allTracks = response.data.map(convertToPlayerTrack);
        state.skip += response.data.length;

        // Filter out tracks we've already seen in this shuffle session
        const unseenTracks = allTracks.filter(t => !state.seenTrackIds.has(t.id));
        newTracks.push(...unseenTracks);

        // Check if we've gone through all tracks in the library
        if (!response.hasMore) {
          // We've reached the end of the library
          if (state.seenTrackIds.size >= state.totalTracks) {
            // All tracks have been played - reset for a new cycle
            console.log('[ShufflePlay] Completed full library cycle, resetting...');
            state.seenTrackIds.clear();
            state.seed = Math.random(); // New seed for fresh order
            state.skip = 0;
            // Continue to load fresh tracks with new seed
            continue;
          }
          break;
        }

        attempts++;
      }

      if (newTracks.length > 0) {
        // Limit to BATCH_SIZE to avoid adding too many at once
        const tracksToAdd = newTracks.slice(0, BATCH_SIZE);
        // Mark these tracks as seen
        tracksToAdd.forEach(t => {
          state.seenTrackIds.add(t.id);
          state.queueIds.add(t.id);
        });
        addToQueue(tracksToAdd);

        // Determine if there are more tracks available
        const remainingUnseen = state.totalTracks - state.seenTrackIds.size;
        setHasMore(remainingUnseen > 0 || state.skip < state.totalTracks);
      } else {
        // No new tracks found, but if we haven't seen all, we can cycle
        if (state.seenTrackIds.size >= state.totalTracks && state.totalTracks > 0) {
          // Reset for new cycle
          state.seenTrackIds.clear();
          state.seed = Math.random();
          state.skip = 0;
          setHasMore(true);
        } else {
          setHasMore(false);
        }
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
      const state = shuffleRef.current;

      // Check if we should continue from existing session or start fresh
      // Start fresh if seenTrackIds is empty or we've seen all tracks
      const shouldStartFresh = state.seenTrackIds.size === 0 ||
        (state.totalTracks > 0 && state.seenTrackIds.size >= state.totalTracks);

      if (shouldStartFresh) {
        // Reset for a completely new shuffle session
        state.seenTrackIds.clear();
        state.totalTracks = 0;
      }

      const newTracks: Track[] = [];
      let currentSeed: number | null = null;
      let currentSkip = 0;
      let attempts = 0;
      const maxAttempts = 5;

      // Fetch tracks until we have enough unseen ones
      while (newTracks.length < BATCH_SIZE && attempts < maxAttempts) {
        const response = await tracksService.getShuffled({
          seed: currentSeed ?? undefined,
          skip: currentSkip,
          take: BATCH_SIZE,
        });

        if (currentSeed === null) {
          currentSeed = response.seed;
        }
        state.totalTracks = response.total;

        if (response.data.length === 0) {
          break;
        }

        const allTracks = response.data.map(convertToPlayerTrack);
        currentSkip += response.data.length;

        // Filter out tracks we've already seen
        const unseenTracks = allTracks.filter(t => !state.seenTrackIds.has(t.id));
        newTracks.push(...unseenTracks);

        if (!response.hasMore) {
          // Reached end of library
          if (state.seenTrackIds.size + newTracks.length >= state.totalTracks && newTracks.length < BATCH_SIZE) {
            // We've gone through all tracks - reset and get fresh ones
            console.log('[ShufflePlay] All tracks seen, resetting for new cycle...');
            state.seenTrackIds.clear();
            currentSeed = Math.random();
            currentSkip = 0;
            // Don't count this as an attempt since we're starting fresh
            continue;
          }
          break;
        }

        attempts++;
      }

      if (newTracks.length === 0) {
        console.warn('[ShufflePlay] No tracks available');
        return;
      }

      // Limit to BATCH_SIZE
      const tracksToPlay = newTracks.slice(0, BATCH_SIZE);
      const queueIds = new Set(tracksToPlay.map(t => t.id));

      // Mark these tracks as seen
      tracksToPlay.forEach(t => state.seenTrackIds.add(t.id));

      // Update state
      state.seed = currentSeed;
      state.skip = currentSkip;
      state.loading = false;
      state.queueIds = queueIds;

      // Determine if there are more unseen tracks
      const remainingUnseen = state.totalTracks - state.seenTrackIds.size;
      setHasMore(remainingUnseen > 0);

      if (!isShuffle) toggleShuffle();
      playQueue(tracksToPlay, 0);
    } catch (error) {
      console.error('[ShufflePlay] Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isShuffle, toggleShuffle, playQueue]);

  // Auto-prefetch when remaining tracks in queue is low
  // Calculate how many tracks are left to play from current position
  const remainingTracks = currentIndex >= 0 ? queue.length - currentIndex - 1 : queue.length;

  useEffect(() => {
    if (shuffleRef.current.seed && hasMore && !shuffleRef.current.loading && remainingTracks <= PREFETCH_THRESHOLD) {
      loadMoreTracks();
    }
  }, [remainingTracks, hasMore, loadMoreTracks]);

  return { shufflePlay, isLoading, loadMoreTracks, hasMore };
}
