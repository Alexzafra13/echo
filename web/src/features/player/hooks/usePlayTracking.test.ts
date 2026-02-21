import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayTracking } from './usePlayTracking';
import * as playTrackingService from '@shared/services/play-tracking.service';
import type { Track } from '../types';
import type { AudioElements } from './useAudioElements';

// Mock the play tracking service
vi.mock('@shared/services/play-tracking.service', () => ({
  recordPlay: vi.fn().mockResolvedValue(undefined),
  recordSkip: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger to avoid console noise
vi.mock('@shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

const createTrack = (id: string): Track => ({
  id,
  title: `Track ${id}`,
  artist: `Artist ${id}`,
  duration: 180,
  path: `/music/${id}.mp3`,
});

const createMockAudioElements = (
  currentTime: number = 0,
  duration: number = 180
): AudioElements => ({
  audioA: new Audio(),
  audioB: new Audio(),
  activeAudio: 'A',
  getActiveAudio: vi.fn(),
  getInactiveAudio: vi.fn(),
  getCurrentTime: vi.fn().mockReturnValue(currentTime),
  getDuration: vi.fn().mockReturnValue(duration),
  setVolume: vi.fn(),
  playActive: vi.fn(),
  pauseActive: vi.fn(),
  playInactive: vi.fn(),
  loadOnActive: vi.fn(),
  loadOnInactive: vi.fn(),
  switchAudio: vi.fn(),
  stopBoth: vi.fn(),
  resetToAudioA: vi.fn(),
  fadeOutAudio: vi.fn(),
  setOnEnded: vi.fn(),
  setOnTimeUpdate: vi.fn(),
  setOnError: vi.fn(),
  setOnCanPlay: vi.fn(),
  setOnLoadedMetadata: vi.fn(),
  setOnWaiting: vi.fn(),
  setOnPlaying: vi.fn(),
});

describe('usePlayTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startPlaySession', () => {
    it('should start a new play session with track info', () => {
      const audioElements = createMockAudioElements();
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      const track = createTrack('track-1');

      act(() => {
        result.current.startPlaySession(track);
      });

      expect(result.current.hasActiveSession()).toBe(true);
      expect(result.current.getCurrentSessionTrackId()).toBe('track-1');
    });

    it('should use shuffle context when isShuffle is true', () => {
      const audioElements = createMockAudioElements();
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: true }));

      const track = createTrack('track-1');

      act(() => {
        result.current.startPlaySession(track);
      });

      expect(result.current.hasActiveSession()).toBe(true);
    });

    it('should allow custom context override', () => {
      const audioElements = createMockAudioElements();
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      const track = createTrack('track-1');

      act(() => {
        result.current.startPlaySession(track, 'playlist');
      });

      expect(result.current.hasActiveSession()).toBe(true);
    });
  });

  describe('endPlaySession', () => {
    it('should record skip when skipped is true', async () => {
      const audioElements = createMockAudioElements(30, 180); // 30s played of 180s
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      const track = createTrack('track-1');

      act(() => {
        result.current.startPlaySession(track);
      });

      await act(async () => {
        await result.current.endPlaySession(true);
      });

      expect(playTrackingService.recordSkip).toHaveBeenCalledWith(
        expect.objectContaining({
          trackId: 'track-1',
          timeListened: 30,
          totalDuration: 180,
          playContext: 'direct',
        })
      );
      expect(playTrackingService.recordPlay).not.toHaveBeenCalled();
    });

    it('should record play when completion rate >= 30%', async () => {
      const audioElements = createMockAudioElements(60, 180); // 33% completion
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      const track = createTrack('track-1');

      act(() => {
        result.current.startPlaySession(track);
      });

      await act(async () => {
        await result.current.endPlaySession(false);
      });

      expect(playTrackingService.recordPlay).toHaveBeenCalledWith(
        expect.objectContaining({
          trackId: 'track-1',
          playContext: 'direct',
          completionRate: expect.closeTo(0.333, 2),
        })
      );
      expect(playTrackingService.recordSkip).not.toHaveBeenCalled();
    });

    it('should record play when completion rate >= 95%', async () => {
      const audioElements = createMockAudioElements(175, 180); // ~97% completion
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      const track = createTrack('track-1');

      act(() => {
        result.current.startPlaySession(track);
      });

      await act(async () => {
        await result.current.endPlaySession(false);
      });

      expect(playTrackingService.recordPlay).toHaveBeenCalled();
    });

    it('should not record play when completion rate < 30% and not skipped', async () => {
      const audioElements = createMockAudioElements(20, 180); // ~11% completion
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      const track = createTrack('track-1');

      act(() => {
        result.current.startPlaySession(track);
      });

      await act(async () => {
        await result.current.endPlaySession(false);
      });

      expect(playTrackingService.recordPlay).not.toHaveBeenCalled();
      expect(playTrackingService.recordSkip).not.toHaveBeenCalled();
    });

    it('should do nothing if no active session', async () => {
      const audioElements = createMockAudioElements();
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      await act(async () => {
        await result.current.endPlaySession(false);
      });

      expect(playTrackingService.recordPlay).not.toHaveBeenCalled();
      expect(playTrackingService.recordSkip).not.toHaveBeenCalled();
    });

    it('should clear session after ending', async () => {
      const audioElements = createMockAudioElements(60, 180);
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      const track = createTrack('track-1');

      act(() => {
        result.current.startPlaySession(track);
      });

      expect(result.current.hasActiveSession()).toBe(true);

      await act(async () => {
        await result.current.endPlaySession(false);
      });

      expect(result.current.hasActiveSession()).toBe(false);
      expect(result.current.getCurrentSessionTrackId()).toBe(null);
    });
  });

  describe('setSessionSource', () => {
    it('should set source info on active session', () => {
      const audioElements = createMockAudioElements();
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      const track = createTrack('track-1');

      act(() => {
        result.current.startPlaySession(track);
      });

      act(() => {
        result.current.setSessionSource('playlist-123', 'playlist');
      });

      // Verify by checking the ref directly
      expect(result.current.playSessionRef.current?.sourceId).toBe('playlist-123');
      expect(result.current.playSessionRef.current?.sourceType).toBe('playlist');
    });

    it('should do nothing if no active session', () => {
      const audioElements = createMockAudioElements();
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      // Should not throw
      act(() => {
        result.current.setSessionSource('playlist-123', 'playlist');
      });

      expect(result.current.playSessionRef.current).toBe(null);
    });

    it('should include source info in recorded play', async () => {
      const audioElements = createMockAudioElements(100, 180);
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      const track = createTrack('track-1');

      act(() => {
        result.current.startPlaySession(track);
      });

      act(() => {
        result.current.setSessionSource('album-456', 'album');
      });

      await act(async () => {
        await result.current.endPlaySession(false);
      });

      expect(playTrackingService.recordPlay).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'album-456',
          sourceType: 'album',
        })
      );
    });

    it('should include source info in recorded skip', async () => {
      const audioElements = createMockAudioElements(30, 180);
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      const track = createTrack('track-1');

      act(() => {
        result.current.startPlaySession(track);
      });

      act(() => {
        result.current.setSessionSource('artist-789', 'artist');
      });

      await act(async () => {
        await result.current.endPlaySession(true);
      });

      expect(playTrackingService.recordSkip).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'artist-789',
          sourceType: 'artist',
        })
      );
    });
  });

  describe('hasActiveSession', () => {
    it('should return false when no session', () => {
      const audioElements = createMockAudioElements();
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      expect(result.current.hasActiveSession()).toBe(false);
    });

    it('should return true when session active', () => {
      const audioElements = createMockAudioElements();
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      act(() => {
        result.current.startPlaySession(createTrack('1'));
      });

      expect(result.current.hasActiveSession()).toBe(true);
    });
  });

  describe('getCurrentSessionTrackId', () => {
    it('should return null when no session', () => {
      const audioElements = createMockAudioElements();
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      expect(result.current.getCurrentSessionTrackId()).toBe(null);
    });

    it('should return track id when session active', () => {
      const audioElements = createMockAudioElements();
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      act(() => {
        result.current.startPlaySession(createTrack('my-track'));
      });

      expect(result.current.getCurrentSessionTrackId()).toBe('my-track');
    });
  });

  describe('context detection', () => {
    it('should use direct context by default', () => {
      const audioElements = createMockAudioElements(100, 180);
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      act(() => {
        result.current.startPlaySession(createTrack('1'));
      });

      expect(result.current.playSessionRef.current?.playContext).toBe('direct');
    });

    it('should use shuffle context when shuffle enabled', () => {
      const audioElements = createMockAudioElements(100, 180);
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: true }));

      act(() => {
        result.current.startPlaySession(createTrack('1'));
      });

      expect(result.current.playSessionRef.current?.playContext).toBe('shuffle');
    });
  });

  describe('edge cases', () => {
    it('should handle zero duration gracefully', async () => {
      const audioElements = createMockAudioElements(0, 0);
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      act(() => {
        result.current.startPlaySession(createTrack('1'));
      });

      await act(async () => {
        await result.current.endPlaySession(false);
      });

      // Should not record with 0% completion
      expect(playTrackingService.recordPlay).not.toHaveBeenCalled();
    });

    it('should handle multiple sessions sequentially', async () => {
      const audioElements = createMockAudioElements(60, 180);
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      // First session
      act(() => {
        result.current.startPlaySession(createTrack('track-1'));
      });

      await act(async () => {
        await result.current.endPlaySession(false);
      });

      // Second session
      act(() => {
        result.current.startPlaySession(createTrack('track-2'));
      });

      await act(async () => {
        await result.current.endPlaySession(true);
      });

      expect(playTrackingService.recordPlay).toHaveBeenCalledTimes(1);
      expect(playTrackingService.recordSkip).toHaveBeenCalledTimes(1);

      expect(playTrackingService.recordPlay).toHaveBeenCalledWith(
        expect.objectContaining({ trackId: 'track-1' })
      );
      expect(playTrackingService.recordSkip).toHaveBeenCalledWith(
        expect.objectContaining({ trackId: 'track-2' })
      );
    });

    it('should start new session even if previous not ended', () => {
      const audioElements = createMockAudioElements();
      const { result } = renderHook(() => usePlayTracking({ audioElements, isShuffle: false }));

      act(() => {
        result.current.startPlaySession(createTrack('track-1'));
      });

      // Start new session without ending previous
      act(() => {
        result.current.startPlaySession(createTrack('track-2'));
      });

      expect(result.current.getCurrentSessionTrackId()).toBe('track-2');
    });
  });
});
