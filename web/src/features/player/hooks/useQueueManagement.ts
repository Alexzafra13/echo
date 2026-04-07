/**
 * useQueueManagement Hook
 *
 * Manages the playback queue including adding, removing, and navigating tracks.
 * Handles shuffle and repeat modes.
 */

import { useState, useCallback, useRef } from 'react';
import type { Track } from '../types';

export type RepeatMode = 'off' | 'all' | 'one';

interface QueueState {
  queue: Track[];
  currentIndex: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
}

export function useQueueManagement() {
  const [state, setState] = useState<QueueState>({
    queue: [],
    currentIndex: -1,
    isShuffle: false,
    repeatMode: 'off',
  });

  // Ref síncrono del state para que getNextIndex/getPreviousIndex/etc.
  // no necesiten [state] como dependencia de useCallback, evitando
  // recreación en cascada de todos los callbacks en cada operación de queue.
  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * Add one or more tracks to the end of the queue
   */
  const addToQueue = useCallback((track: Track | Track[]) => {
    const tracks = Array.isArray(track) ? track : [track];
    setState((prev) => ({
      ...prev,
      queue: [...prev.queue, ...tracks],
    }));
  }, []);

  /**
   * Remove a track from the queue by index
   */
  const removeFromQueue = useCallback((index: number) => {
    setState((prev) => {
      const newQueue = [...prev.queue];
      newQueue.splice(index, 1);

      let newIndex = prev.currentIndex;
      if (index < prev.currentIndex) {
        newIndex = prev.currentIndex - 1;
      } else if (index === prev.currentIndex && newQueue.length > 0) {
        // Keep same index (will point to next track)
        newIndex = Math.min(prev.currentIndex, newQueue.length - 1);
      }

      return {
        ...prev,
        queue: newQueue,
        currentIndex: newQueue.length === 0 ? -1 : newIndex,
      };
    });
  }, []);

  /**
   * Clear the entire queue
   */
  const clearQueue = useCallback(() => {
    setState((prev) => ({
      ...prev,
      queue: [],
      currentIndex: -1,
    }));
  }, []);

  /**
   * Set a new queue and optionally start at a specific index
   */
  const setQueue = useCallback((tracks: Track[], startIndex: number = 0) => {
    setState((prev) => ({
      ...prev,
      queue: tracks,
      currentIndex: tracks.length > 0 ? startIndex : -1,
    }));
  }, []);

  /**
   * Set the current index in the queue
   */
  const setCurrentIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      currentIndex: index,
    }));
  }, []);

  /**
   * Get the next track index based on repeat settings.
   * Returns -1 if no next track is available.
   *
   * Shuffle: la queue ya viene randomizada del backend (seed determinístico).
   * Solo avanzamos secuencialmente por la queue pre-shuffled.
   */
  const getNextIndex = useCallback((): number => {
    const { queue, currentIndex, repeatMode } = stateRef.current;

    if (queue.length === 0) return -1;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      return repeatMode === 'all' ? 0 : -1;
    }

    return nextIndex;
  }, []);

  const getPreviousIndex = useCallback((): number => {
    const { queue, currentIndex, repeatMode } = stateRef.current;

    if (queue.length === 0) return -1;

    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      return repeatMode === 'all' ? queue.length - 1 : 0;
    }

    return prevIndex;
  }, []);

  /**
   * Move to the next track
   * Returns the new index or -1 if no next track
   */
  const moveToNext = useCallback((): number => {
    const nextIndex = getNextIndex();
    if (nextIndex !== -1) {
      setState((prev) => ({
        ...prev,
        currentIndex: nextIndex,
      }));
    }
    return nextIndex;
  }, [getNextIndex]);

  /**
   * Move to the previous track
   * Returns the new index
   */
  const moveToPrevious = useCallback((): number => {
    const prevIndex = getPreviousIndex();
    setState((prev) => ({
      ...prev,
      currentIndex: prevIndex,
    }));
    return prevIndex;
  }, [getPreviousIndex]);

  const hasNext = useCallback((): boolean => {
    const { queue, currentIndex, repeatMode } = stateRef.current;
    if (queue.length === 0) return false;
    if (repeatMode === 'all') return queue.length > 0;
    return currentIndex < queue.length - 1;
  }, []);

  const hasPrevious = useCallback((): boolean => {
    const { queue, currentIndex, repeatMode } = stateRef.current;
    if (queue.length === 0) return false;
    if (repeatMode === 'all') return queue.length > 0;
    return currentIndex > 0;
  }, []);

  const getCurrentTrack = useCallback((): Track | null => {
    const { queue, currentIndex } = stateRef.current;
    if (currentIndex < 0 || currentIndex >= queue.length) return null;
    return queue[currentIndex];
  }, []);

  const getTrackAt = useCallback((index: number): Track | null => {
    const { queue } = stateRef.current;
    if (index < 0 || index >= queue.length) return null;
    return queue[index];
  }, []);

  /**
   * Toggle shuffle mode
   */
  const toggleShuffle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isShuffle: !prev.isShuffle,
    }));
  }, []);

  /**
   * Set shuffle mode
   */
  const setShuffle = useCallback((enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      isShuffle: enabled,
    }));
  }, []);

  /**
   * Cycle through repeat modes: off -> all -> one -> off
   */
  const toggleRepeat = useCallback(() => {
    setState((prev) => {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const currentModeIndex = modes.indexOf(prev.repeatMode);
      const nextMode = modes[(currentModeIndex + 1) % modes.length];
      return {
        ...prev,
        repeatMode: nextMode,
      };
    });
  }, []);

  /**
   * Set repeat mode directly
   */
  const setRepeatMode = useCallback((mode: RepeatMode) => {
    setState((prev) => ({
      ...prev,
      repeatMode: mode,
    }));
  }, []);

  return {
    // State
    queue: state.queue,
    currentIndex: state.currentIndex,
    isShuffle: state.isShuffle,
    repeatMode: state.repeatMode,

    // Queue operations
    addToQueue,
    removeFromQueue,
    clearQueue,
    setQueue,
    setCurrentIndex,

    // Navigation
    getNextIndex,
    getPreviousIndex,
    moveToNext,
    moveToPrevious,
    hasNext,
    hasPrevious,

    // Track getters
    getCurrentTrack,
    getTrackAt,

    // Mode toggles
    toggleShuffle,
    setShuffle,
    toggleRepeat,
    setRepeatMode,
  };
}

export type QueueManagement = ReturnType<typeof useQueueManagement>;
