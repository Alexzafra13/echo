/**
 * useQueueManager Hook
 *
 * Manages playback queue operations including add, remove, clear, and navigation.
 */

import { useState, useCallback } from 'react';
import type { Track } from '../types';

interface UseQueueManagerParams {
  onPlayTrack: (track: Track, index: number) => void;
  onEndSession: (skipped: boolean) => void;
  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;
}

export function useQueueManager({
  onPlayTrack,
  onEndSession,
  repeatMode,
  isShuffle
}: UseQueueManagerParams) {
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);

  // Add tracks to queue
  const addToQueue = useCallback((track: Track | Track[]) => {
    const tracks = Array.isArray(track) ? track : [track];
    setQueue(prev => [...prev, ...tracks]);
  }, []);

  // Clear queue
  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentQueueIndex(-1);
  }, []);

  // Remove track from queue
  const removeFromQueue = useCallback((index: number, shouldPlayNext: (index: number) => void) => {
    setQueue(prev => {
      const newQueue = [...prev];
      newQueue.splice(index, 1);
      return newQueue;
    });

    if (index < currentQueueIndex) {
      setCurrentQueueIndex(currentQueueIndex - 1);
    } else if (index === currentQueueIndex) {
      // If removed current track, play next
      shouldPlayNext(index);
    }
  }, [currentQueueIndex]);

  // Play queue of tracks
  const playQueue = useCallback((tracks: Track[], startIndex: number = 0) => {
    setQueue(tracks);
    setCurrentQueueIndex(startIndex);
    onPlayTrack(tracks[startIndex], startIndex);
  }, [onPlayTrack]);

  // Play next track in queue
  const playNext = useCallback(() => {
    if (queue.length === 0) return;

    // End current session as skipped if there's an active session
    onEndSession(true);

    let nextIndex: number;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentQueueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return;
        }
      }
    }

    setCurrentQueueIndex(nextIndex);
    onPlayTrack(queue[nextIndex], nextIndex);
  }, [queue, isShuffle, repeatMode, currentQueueIndex, onEndSession, onPlayTrack]);

  // Play previous track in queue
  const playPrevious = useCallback((audioCurrentTime: number, shouldRestart: () => void) => {
    if (queue.length === 0) return;

    // If more than 3 seconds played, restart current track
    if (audioCurrentTime > 3) {
      shouldRestart();
      return;
    }

    // End current session as skipped
    onEndSession(true);

    let prevIndex = currentQueueIndex - 1;
    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = queue.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    setCurrentQueueIndex(prevIndex);
    onPlayTrack(queue[prevIndex], prevIndex);
  }, [queue, repeatMode, currentQueueIndex, onEndSession, onPlayTrack]);

  return {
    queue,
    currentQueueIndex,
    addToQueue,
    clearQueue,
    removeFromQueue,
    playQueue,
    playNext,
    playPrevious,
  };
}
