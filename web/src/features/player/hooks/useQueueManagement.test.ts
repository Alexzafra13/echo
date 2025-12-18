import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQueueManagement } from './useQueueManagement';
import type { Track } from '../types';

// Mock tracks for testing
const createMockTrack = (id: string, title: string): Track => ({
  id,
  title,
  artistName: 'Test Artist',
  albumName: 'Test Album',
  duration: 180,
});

const mockTracks: Track[] = [
  createMockTrack('1', 'Track 1'),
  createMockTrack('2', 'Track 2'),
  createMockTrack('3', 'Track 3'),
  createMockTrack('4', 'Track 4'),
  createMockTrack('5', 'Track 5'),
];

describe('useQueueManagement', () => {
  describe('initial state', () => {
    it('should initialize with empty queue', () => {
      const { result } = renderHook(() => useQueueManagement());

      expect(result.current.queue).toEqual([]);
      expect(result.current.currentIndex).toBe(-1);
      expect(result.current.isShuffle).toBe(false);
      expect(result.current.repeatMode).toBe('off');
    });
  });

  describe('setQueue', () => {
    it('should set queue and start at index 0 by default', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks);
      });

      expect(result.current.queue).toHaveLength(5);
      expect(result.current.currentIndex).toBe(0);
    });

    it('should set queue and start at specified index', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks, 2);
      });

      expect(result.current.currentIndex).toBe(2);
      expect(result.current.getCurrentTrack()?.id).toBe('3');
    });

    it('should set currentIndex to -1 for empty queue', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue([]);
      });

      expect(result.current.currentIndex).toBe(-1);
    });
  });

  describe('addToQueue', () => {
    it('should add single track to queue', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.addToQueue(mockTracks[0]);
      });

      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].id).toBe('1');
    });

    it('should add multiple tracks to queue', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.addToQueue(mockTracks.slice(0, 3));
      });

      expect(result.current.queue).toHaveLength(3);
    });

    it('should append to existing queue', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks.slice(0, 2));
        result.current.addToQueue(mockTracks[2]);
      });

      expect(result.current.queue).toHaveLength(3);
      expect(result.current.queue[2].id).toBe('3');
    });
  });

  describe('removeFromQueue', () => {
    it('should remove track at specified index', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks);
        result.current.removeFromQueue(2);
      });

      expect(result.current.queue).toHaveLength(4);
      expect(result.current.queue.find(t => t.id === '3')).toBeUndefined();
    });

    it('should adjust currentIndex when removing track before it', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks, 3); // Start at Track 4
        result.current.removeFromQueue(1); // Remove Track 2
      });

      expect(result.current.currentIndex).toBe(2); // Should decrease by 1
    });

    it('should keep currentIndex when removing track after it', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks, 1); // Start at Track 2
        result.current.removeFromQueue(3); // Remove Track 4
      });

      expect(result.current.currentIndex).toBe(1); // Should stay same
    });

    it('should handle removing current track', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks, 2); // Start at Track 3
        result.current.removeFromQueue(2); // Remove current track
      });

      // Should point to next track (now at same index)
      expect(result.current.currentIndex).toBe(2);
      expect(result.current.getCurrentTrack()?.id).toBe('4');
    });

    it('should set currentIndex to -1 when queue becomes empty', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue([mockTracks[0]]);
        result.current.removeFromQueue(0);
      });

      expect(result.current.queue).toHaveLength(0);
      expect(result.current.currentIndex).toBe(-1);
    });
  });

  describe('clearQueue', () => {
    it('should clear all tracks and reset index', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks, 2);
        result.current.clearQueue();
      });

      expect(result.current.queue).toHaveLength(0);
      expect(result.current.currentIndex).toBe(-1);
    });
  });

  describe('navigation - moveToNext', () => {
    it('should move to next track', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks);
      });

      act(() => {
        result.current.moveToNext();
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.getCurrentTrack()?.id).toBe('2');
    });

    it('should return -1 at end of queue with repeat off', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks, 4); // Last track
      });

      let nextIndex: number = -1;
      act(() => {
        nextIndex = result.current.moveToNext();
      });

      expect(nextIndex).toBe(-1);
      expect(result.current.currentIndex).toBe(4); // Should stay at last
    });

    it('should loop to start with repeat all', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks, 4);
        result.current.setRepeatMode('all');
      });

      act(() => {
        result.current.moveToNext();
      });

      expect(result.current.currentIndex).toBe(0);
    });

    it('should return -1 for empty queue', () => {
      const { result } = renderHook(() => useQueueManagement());

      let nextIndex: number = 0;
      act(() => {
        nextIndex = result.current.getNextIndex();
      });

      expect(nextIndex).toBe(-1);
    });
  });

  describe('navigation - moveToPrevious', () => {
    it('should move to previous track', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks, 2);
      });

      act(() => {
        result.current.moveToPrevious();
      });

      expect(result.current.currentIndex).toBe(1);
    });

    it('should stay at first track with repeat off', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks, 0);
      });

      act(() => {
        result.current.moveToPrevious();
      });

      expect(result.current.currentIndex).toBe(0);
    });

    it('should loop to end with repeat all', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks, 0);
        result.current.setRepeatMode('all');
      });

      act(() => {
        result.current.moveToPrevious();
      });

      expect(result.current.currentIndex).toBe(4); // Last track
    });
  });

  describe('hasNext / hasPrevious', () => {
    it('should return false for empty queue', () => {
      const { result } = renderHook(() => useQueueManagement());

      expect(result.current.hasNext()).toBe(false);
      expect(result.current.hasPrevious()).toBe(false);
    });

    it('should return correct values for middle of queue', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks, 2);
      });

      expect(result.current.hasNext()).toBe(true);
      expect(result.current.hasPrevious()).toBe(true);
    });

    it('should return hasNext=false at end with repeat off', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks, 4);
      });

      expect(result.current.hasNext()).toBe(false);
    });

    it('should return hasNext=true at end with repeat all', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks, 4);
        result.current.setRepeatMode('all');
      });

      expect(result.current.hasNext()).toBe(true);
    });
  });

  describe('getCurrentTrack / getTrackAt', () => {
    it('should return null for empty queue', () => {
      const { result } = renderHook(() => useQueueManagement());

      expect(result.current.getCurrentTrack()).toBeNull();
      expect(result.current.getTrackAt(0)).toBeNull();
    });

    it('should return correct track', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks, 2);
      });

      expect(result.current.getCurrentTrack()?.id).toBe('3');
      expect(result.current.getTrackAt(0)?.id).toBe('1');
      expect(result.current.getTrackAt(4)?.id).toBe('5');
    });

    it('should return null for invalid index', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks);
      });

      expect(result.current.getTrackAt(-1)).toBeNull();
      expect(result.current.getTrackAt(10)).toBeNull();
    });
  });

  describe('shuffle mode', () => {
    it('should toggle shuffle', () => {
      const { result } = renderHook(() => useQueueManagement());

      expect(result.current.isShuffle).toBe(false);

      act(() => {
        result.current.toggleShuffle();
      });

      expect(result.current.isShuffle).toBe(true);

      act(() => {
        result.current.toggleShuffle();
      });

      expect(result.current.isShuffle).toBe(false);
    });

    it('should set shuffle directly', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setShuffle(true);
      });

      expect(result.current.isShuffle).toBe(true);
    });
  });

  describe('repeat mode', () => {
    it('should cycle through repeat modes', () => {
      const { result } = renderHook(() => useQueueManagement());

      expect(result.current.repeatMode).toBe('off');

      act(() => {
        result.current.toggleRepeat();
      });
      expect(result.current.repeatMode).toBe('all');

      act(() => {
        result.current.toggleRepeat();
      });
      expect(result.current.repeatMode).toBe('one');

      act(() => {
        result.current.toggleRepeat();
      });
      expect(result.current.repeatMode).toBe('off');
    });

    it('should set repeat mode directly', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setRepeatMode('one');
      });

      expect(result.current.repeatMode).toBe('one');
    });
  });

  describe('setCurrentIndex', () => {
    it('should set current index directly', () => {
      const { result } = renderHook(() => useQueueManagement());

      act(() => {
        result.current.setQueue(mockTracks);
        result.current.setCurrentIndex(3);
      });

      expect(result.current.currentIndex).toBe(3);
      expect(result.current.getCurrentTrack()?.id).toBe('4');
    });
  });
});
