import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQueueManager } from './useQueueManager';
import type { Track } from '../types';

// Mock track factory
const createTrack = (id: string): Track => ({
  id,
  title: `Track ${id}`,
  artist: `Artist ${id}`,
  duration: 180,
  path: `/music/${id}.mp3`,
});

describe('useQueueManager', () => {
  let onPlayTrack: ReturnType<typeof vi.fn>;
  let onEndSession: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onPlayTrack = vi.fn();
    onEndSession = vi.fn();
  });

  const renderQueueManager = (options: {
    repeatMode?: 'off' | 'all' | 'one';
    isShuffle?: boolean;
  } = {}) => {
    return renderHook(() =>
      useQueueManager({
        onPlayTrack,
        onEndSession,
        repeatMode: options.repeatMode ?? 'off',
        isShuffle: options.isShuffle ?? false,
      })
    );
  };

  describe('initial state', () => {
    it('should start with empty queue', () => {
      const { result } = renderQueueManager();

      expect(result.current.queue).toEqual([]);
      expect(result.current.currentQueueIndex).toBe(-1);
    });
  });

  describe('addToQueue', () => {
    it('should add a single track to queue', () => {
      const { result } = renderQueueManager();
      const track = createTrack('1');

      act(() => {
        result.current.addToQueue(track);
      });

      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0]).toEqual(track);
    });

    it('should add multiple tracks to queue', () => {
      const { result } = renderQueueManager();
      const tracks = [createTrack('1'), createTrack('2'), createTrack('3')];

      act(() => {
        result.current.addToQueue(tracks);
      });

      expect(result.current.queue).toHaveLength(3);
      expect(result.current.queue).toEqual(tracks);
    });

    it('should append tracks to existing queue', () => {
      const { result } = renderQueueManager();
      const track1 = createTrack('1');
      const track2 = createTrack('2');

      act(() => {
        result.current.addToQueue(track1);
      });

      act(() => {
        result.current.addToQueue(track2);
      });

      expect(result.current.queue).toHaveLength(2);
      expect(result.current.queue[0]).toEqual(track1);
      expect(result.current.queue[1]).toEqual(track2);
    });
  });

  describe('clearQueue', () => {
    it('should clear all tracks from queue', () => {
      const { result } = renderQueueManager();
      const tracks = [createTrack('1'), createTrack('2')];

      act(() => {
        result.current.playQueue(tracks, 0);
      });

      expect(result.current.queue).toHaveLength(2);

      act(() => {
        result.current.clearQueue();
      });

      expect(result.current.queue).toEqual([]);
      expect(result.current.currentQueueIndex).toBe(-1);
    });
  });

  describe('playQueue', () => {
    it('should set queue and play from start index', () => {
      const { result } = renderQueueManager();
      const tracks = [createTrack('1'), createTrack('2'), createTrack('3')];

      act(() => {
        result.current.playQueue(tracks, 0);
      });

      expect(result.current.queue).toEqual(tracks);
      expect(result.current.currentQueueIndex).toBe(0);
      expect(onPlayTrack).toHaveBeenCalledWith(tracks[0], 0);
    });

    it('should play from specified start index', () => {
      const { result } = renderQueueManager();
      const tracks = [createTrack('1'), createTrack('2'), createTrack('3')];

      act(() => {
        result.current.playQueue(tracks, 2);
      });

      expect(result.current.currentQueueIndex).toBe(2);
      expect(onPlayTrack).toHaveBeenCalledWith(tracks[2], 2);
    });

    it('should default to index 0 if not specified', () => {
      const { result } = renderQueueManager();
      const tracks = [createTrack('1'), createTrack('2')];

      act(() => {
        result.current.playQueue(tracks);
      });

      expect(result.current.currentQueueIndex).toBe(0);
      expect(onPlayTrack).toHaveBeenCalledWith(tracks[0], 0);
    });
  });

  describe('removeFromQueue', () => {
    it('should remove track at specified index', () => {
      const { result } = renderQueueManager();
      const tracks = [createTrack('1'), createTrack('2'), createTrack('3')];
      const shouldPlayNext = vi.fn();

      act(() => {
        result.current.playQueue(tracks, 0);
      });

      act(() => {
        result.current.removeFromQueue(1, shouldPlayNext);
      });

      expect(result.current.queue).toHaveLength(2);
      expect(result.current.queue[0].id).toBe('1');
      expect(result.current.queue[1].id).toBe('3');
    });

    it('should adjust currentQueueIndex when removing track before current', () => {
      const { result } = renderQueueManager();
      const tracks = [createTrack('1'), createTrack('2'), createTrack('3')];
      const shouldPlayNext = vi.fn();

      act(() => {
        result.current.playQueue(tracks, 2);
      });

      expect(result.current.currentQueueIndex).toBe(2);

      act(() => {
        result.current.removeFromQueue(0, shouldPlayNext);
      });

      expect(result.current.currentQueueIndex).toBe(1);
    });

    it('should call shouldPlayNext when removing current track', () => {
      const { result } = renderQueueManager();
      const tracks = [createTrack('1'), createTrack('2'), createTrack('3')];
      const shouldPlayNext = vi.fn();

      act(() => {
        result.current.playQueue(tracks, 1);
      });

      act(() => {
        result.current.removeFromQueue(1, shouldPlayNext);
      });

      expect(shouldPlayNext).toHaveBeenCalledWith(1);
    });

    it('should not change index when removing track after current', () => {
      const { result } = renderQueueManager();
      const tracks = [createTrack('1'), createTrack('2'), createTrack('3')];
      const shouldPlayNext = vi.fn();

      act(() => {
        result.current.playQueue(tracks, 0);
      });

      act(() => {
        result.current.removeFromQueue(2, shouldPlayNext);
      });

      expect(result.current.currentQueueIndex).toBe(0);
      expect(shouldPlayNext).not.toHaveBeenCalled();
    });
  });

  describe('playNext', () => {
    describe('normal mode (no shuffle)', () => {
      it('should play next track in sequence', () => {
        const { result } = renderQueueManager({ repeatMode: 'off', isShuffle: false });
        const tracks = [createTrack('1'), createTrack('2'), createTrack('3')];

        act(() => {
          result.current.playQueue(tracks, 0);
        });

        onPlayTrack.mockClear();

        act(() => {
          result.current.playNext();
        });

        expect(result.current.currentQueueIndex).toBe(1);
        expect(onPlayTrack).toHaveBeenCalledWith(tracks[1], 1);
        expect(onEndSession).toHaveBeenCalledWith(true);
      });

      it('should stop at end of queue when repeat is off', () => {
        const { result } = renderQueueManager({ repeatMode: 'off', isShuffle: false });
        const tracks = [createTrack('1'), createTrack('2')];

        act(() => {
          result.current.playQueue(tracks, 1);
        });

        onPlayTrack.mockClear();

        act(() => {
          result.current.playNext();
        });

        // Should stay at last track
        expect(result.current.currentQueueIndex).toBe(1);
        expect(onPlayTrack).not.toHaveBeenCalled();
      });

      it('should wrap to beginning when repeat all is on', () => {
        const { result } = renderQueueManager({ repeatMode: 'all', isShuffle: false });
        const tracks = [createTrack('1'), createTrack('2')];

        act(() => {
          result.current.playQueue(tracks, 1);
        });

        onPlayTrack.mockClear();

        act(() => {
          result.current.playNext();
        });

        expect(result.current.currentQueueIndex).toBe(0);
        expect(onPlayTrack).toHaveBeenCalledWith(tracks[0], 0);
      });

      it('should do nothing on empty queue', () => {
        const { result } = renderQueueManager();

        act(() => {
          result.current.playNext();
        });

        expect(onPlayTrack).not.toHaveBeenCalled();
        expect(onEndSession).not.toHaveBeenCalled();
      });
    });

    describe('shuffle mode', () => {
      it('should play random unplayed track', () => {
        const { result } = renderQueueManager({ repeatMode: 'off', isShuffle: true });
        const tracks = [createTrack('1'), createTrack('2'), createTrack('3')];

        act(() => {
          result.current.playQueue(tracks, 0);
        });

        onPlayTrack.mockClear();

        act(() => {
          result.current.playNext();
        });

        // Should play a different track (index 1 or 2, not 0)
        expect(result.current.currentQueueIndex).not.toBe(0);
        expect(onPlayTrack).toHaveBeenCalled();
      });

      it('should not repeat tracks until all played', () => {
        const { result } = renderQueueManager({ repeatMode: 'off', isShuffle: true });
        const tracks = [createTrack('1'), createTrack('2'), createTrack('3')];

        act(() => {
          result.current.playQueue(tracks, 0);
        });

        const playedIndices = new Set<number>();
        playedIndices.add(0); // Starting track

        // Play next twice (should play remaining 2 tracks)
        for (let i = 0; i < 2; i++) {
          act(() => {
            result.current.playNext();
          });
          playedIndices.add(result.current.currentQueueIndex);
        }

        // All 3 tracks should have been played
        expect(playedIndices.size).toBe(3);
      });

      it('should stop when all tracks played and repeat is off', () => {
        const { result } = renderQueueManager({ repeatMode: 'off', isShuffle: true });
        const tracks = [createTrack('1'), createTrack('2')];

        act(() => {
          result.current.playQueue(tracks, 0);
        });

        // Play the remaining track
        act(() => {
          result.current.playNext();
        });

        const lastIndex = result.current.currentQueueIndex;
        onPlayTrack.mockClear();

        // Try to play next - should not play anything
        act(() => {
          result.current.playNext();
        });

        expect(result.current.currentQueueIndex).toBe(lastIndex);
        expect(onPlayTrack).not.toHaveBeenCalled();
      });

      it('should reset and continue when repeat all is on', () => {
        const { result } = renderQueueManager({ repeatMode: 'all', isShuffle: true });
        const tracks = [createTrack('1'), createTrack('2')];

        act(() => {
          result.current.playQueue(tracks, 0);
        });

        // Play the remaining track
        act(() => {
          result.current.playNext();
        });

        onPlayTrack.mockClear();

        // Play next after all played - should reset and continue
        act(() => {
          result.current.playNext();
        });

        expect(onPlayTrack).toHaveBeenCalled();
      });
    });
  });

  describe('playPrevious', () => {
    it('should restart track if more than 3 seconds played', () => {
      const { result } = renderQueueManager();
      const tracks = [createTrack('1'), createTrack('2'), createTrack('3')];
      const shouldRestart = vi.fn();

      act(() => {
        result.current.playQueue(tracks, 1);
      });

      onPlayTrack.mockClear();

      act(() => {
        result.current.playPrevious(5, shouldRestart); // 5 seconds played
      });

      expect(shouldRestart).toHaveBeenCalled();
      expect(result.current.currentQueueIndex).toBe(1); // Should stay on same track
      expect(onPlayTrack).not.toHaveBeenCalled();
    });

    it('should go to previous track if less than 3 seconds played', () => {
      const { result } = renderQueueManager();
      const tracks = [createTrack('1'), createTrack('2'), createTrack('3')];
      const shouldRestart = vi.fn();

      act(() => {
        result.current.playQueue(tracks, 1);
      });

      onPlayTrack.mockClear();

      act(() => {
        result.current.playPrevious(2, shouldRestart); // 2 seconds played
      });

      expect(shouldRestart).not.toHaveBeenCalled();
      expect(result.current.currentQueueIndex).toBe(0);
      expect(onPlayTrack).toHaveBeenCalledWith(tracks[0], 0);
      expect(onEndSession).toHaveBeenCalledWith(true);
    });

    it('should stay at first track when repeat is off', () => {
      const { result } = renderQueueManager({ repeatMode: 'off' });
      const tracks = [createTrack('1'), createTrack('2')];
      const shouldRestart = vi.fn();

      act(() => {
        result.current.playQueue(tracks, 0);
      });

      onPlayTrack.mockClear();

      act(() => {
        result.current.playPrevious(1, shouldRestart);
      });

      expect(result.current.currentQueueIndex).toBe(0);
      expect(onPlayTrack).toHaveBeenCalledWith(tracks[0], 0);
    });

    it('should wrap to last track when repeat all is on', () => {
      const { result } = renderQueueManager({ repeatMode: 'all' });
      const tracks = [createTrack('1'), createTrack('2'), createTrack('3')];
      const shouldRestart = vi.fn();

      act(() => {
        result.current.playQueue(tracks, 0);
      });

      onPlayTrack.mockClear();

      act(() => {
        result.current.playPrevious(1, shouldRestart);
      });

      expect(result.current.currentQueueIndex).toBe(2);
      expect(onPlayTrack).toHaveBeenCalledWith(tracks[2], 2);
    });

    it('should do nothing on empty queue', () => {
      const { result } = renderQueueManager();
      const shouldRestart = vi.fn();

      act(() => {
        result.current.playPrevious(0, shouldRestart);
      });

      expect(shouldRestart).not.toHaveBeenCalled();
      expect(onPlayTrack).not.toHaveBeenCalled();
    });
  });

  describe('shuffle index tracking', () => {
    it('should update shuffle indices when removing track', () => {
      const { result } = renderQueueManager({ repeatMode: 'off', isShuffle: true });
      const tracks = [
        createTrack('1'),
        createTrack('2'),
        createTrack('3'),
        createTrack('4'),
        createTrack('5'),
      ];
      const shouldPlayNext = vi.fn();

      act(() => {
        result.current.playQueue(tracks, 0);
      });

      // Play a few tracks to build up shuffle history
      act(() => {
        result.current.playNext();
      });

      act(() => {
        result.current.playNext();
      });

      const playedCount = 3; // Started at 0, played 2 more

      // Remove a track from the middle
      act(() => {
        result.current.removeFromQueue(2, shouldPlayNext);
      });

      // Queue should have 4 tracks now
      expect(result.current.queue).toHaveLength(4);

      // Continue playing - should still avoid repeats correctly
      act(() => {
        result.current.playNext();
      });

      // Should have played 4 unique tracks total
      expect(onPlayTrack).toHaveBeenCalledTimes(4);
    });

    it('should clear shuffle history when queue is cleared', () => {
      const { result } = renderQueueManager({ repeatMode: 'off', isShuffle: true });
      const tracks = [createTrack('1'), createTrack('2'), createTrack('3')];

      act(() => {
        result.current.playQueue(tracks, 0);
      });

      act(() => {
        result.current.playNext();
      });

      act(() => {
        result.current.clearQueue();
      });

      // Start new queue
      act(() => {
        result.current.playQueue(tracks, 0);
      });

      onPlayTrack.mockClear();

      // Should be able to play all tracks again
      act(() => {
        result.current.playNext();
      });

      expect(onPlayTrack).toHaveBeenCalled();
    });

    it('should reset shuffle history when starting new queue', () => {
      const { result } = renderQueueManager({ repeatMode: 'off', isShuffle: true });
      const tracks1 = [createTrack('1'), createTrack('2')];
      const tracks2 = [createTrack('3'), createTrack('4'), createTrack('5')];

      act(() => {
        result.current.playQueue(tracks1, 0);
      });

      // Play all tracks
      act(() => {
        result.current.playNext();
      });

      // Start new queue
      act(() => {
        result.current.playQueue(tracks2, 0);
      });

      onPlayTrack.mockClear();

      // Should be able to play through new queue
      act(() => {
        result.current.playNext();
      });

      act(() => {
        result.current.playNext();
      });

      expect(onPlayTrack).toHaveBeenCalledTimes(2);
    });
  });
});
