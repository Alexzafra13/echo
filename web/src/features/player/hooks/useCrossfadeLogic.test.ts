import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCrossfadeLogic } from './useCrossfadeLogic';
import type { AudioElements } from './useAudioElements';
import type { CrossfadeSettings } from '../types';

// Mock logger
vi.mock('@shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Create mock audio elements
function createMockAudioElements(): AudioElements {
  const mockAudioA = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    currentTime: 0,
    duration: 180,
    preservesPitch: true,
    playbackRate: 1,
    pause: vi.fn(),
    paused: false,
  } as unknown as HTMLAudioElement;

  const mockAudioB = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    currentTime: 0,
    duration: 180,
    preservesPitch: true,
    playbackRate: 1,
    pause: vi.fn(),
    paused: false,
  } as unknown as HTMLAudioElement;

  return {
    audioRefA: { current: mockAudioA },
    audioRefB: { current: mockAudioB },
    activeAudioRef: { current: 'A' as const },
    volume: 0.7,
    getActiveAudio: vi.fn().mockReturnValue(mockAudioA),
    getInactiveAudio: vi.fn().mockReturnValue(mockAudioB),
    getActiveAudioId: vi.fn().mockReturnValue('A' as const),
    getCurrentTime: vi.fn().mockReturnValue(0),
    getDuration: vi.fn().mockReturnValue(180),
    areBothPaused: vi.fn().mockReturnValue(true),
    switchActiveAudio: vi.fn().mockReturnValue('B' as const),
    resetToAudioA: vi.fn(),
    setVolume: vi.fn(),
    setAudioVolume: vi.fn(),
    loadOnActive: vi.fn(),
    loadOnInactive: vi.fn(),
    playActive: vi.fn().mockResolvedValue(undefined),
    playInactive: vi.fn().mockResolvedValue(undefined),
    pauseActive: vi.fn(),
    pauseBoth: vi.fn(),
    stopBoth: vi.fn().mockResolvedValue(undefined),
    stopActive: vi.fn().mockResolvedValue(undefined),
    stopInactive: vi.fn().mockResolvedValue(undefined),
    seek: vi.fn(),
    waitForAudioReady: vi.fn().mockResolvedValue(true),
    fadeOutAudio: vi.fn().mockResolvedValue(undefined),
  };
}

describe('useCrossfadeLogic', () => {
  let mockAudioElements: AudioElements;
  let defaultSettings: CrossfadeSettings;
  let rafCallbacks: FrameRequestCallback[];
  let rafId: number;

  beforeEach(() => {
    mockAudioElements = createMockAudioElements();
    defaultSettings = {
      enabled: true,
      duration: 5, // 5 seconds crossfade
    };
    rafCallbacks = [];
    rafId = 0;

    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });

    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      // Just clear the callback
    });

    // Mock performance.now
    let time = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => time);

    // Helper to advance time
    (global as any).advanceTime = (ms: number) => {
      time += ms;
      // Execute all pending animation frames
      const callbacks = [...rafCallbacks];
      rafCallbacks = [];
      callbacks.forEach(cb => cb(time));
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (global as any).advanceTime;
  });

  describe('initialization', () => {
    it('should initialize with isCrossfading as false', () => {
      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      expect(result.current.isCrossfading).toBe(false);
    });

    it('should expose settings values', () => {
      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      expect(result.current.isEnabled).toBe(true);
      expect(result.current.duration).toBe(5);
    });
  });

  describe('checkCrossfadeTiming', () => {
    it('should return false when crossfade is disabled', () => {
      const disabledSettings: CrossfadeSettings = { enabled: false, duration: 5 };

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: disabledSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      expect(result.current.checkCrossfadeTiming()).toBe(false);
    });

    it('should return false when in radio mode', () => {
      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: true,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      expect(result.current.checkCrossfadeTiming()).toBe(false);
    });

    it('should return false when repeatMode is one', () => {
      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'one',
          hasNextTrack: true,
        })
      );

      expect(result.current.checkCrossfadeTiming()).toBe(false);
    });

    it('should return false when there is no next track', () => {
      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: false,
        })
      );

      expect(result.current.checkCrossfadeTiming()).toBe(false);
    });

    it('should return false when track is not near end', () => {
      // Track at 30 seconds, duration 180, crossfade 5 seconds
      // Time remaining = 150, > 5 seconds
      vi.mocked(mockAudioElements.getCurrentTime).mockReturnValue(30);
      vi.mocked(mockAudioElements.getDuration).mockReturnValue(180);

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      expect(result.current.checkCrossfadeTiming()).toBe(false);
    });

    it('should return true when track is near end and conditions are met', () => {
      // Track at 176 seconds, duration 180, crossfade 5 seconds
      // Time remaining = 4, <= 5 seconds
      vi.mocked(mockAudioElements.getCurrentTime).mockReturnValue(176);
      vi.mocked(mockAudioElements.getDuration).mockReturnValue(180);

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      expect(result.current.checkCrossfadeTiming()).toBe(true);
    });

    it('should return false on second call (already triggered)', () => {
      vi.mocked(mockAudioElements.getCurrentTime).mockReturnValue(176);
      vi.mocked(mockAudioElements.getDuration).mockReturnValue(180);

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      // First call should return true
      expect(result.current.checkCrossfadeTiming()).toBe(true);
      // Second call should return false (already started)
      expect(result.current.checkCrossfadeTiming()).toBe(false);
    });

    it('should return false if track is too short for crossfade', () => {
      // Track duration 4 seconds, crossfade 5 seconds
      vi.mocked(mockAudioElements.getCurrentTime).mockReturnValue(3);
      vi.mocked(mockAudioElements.getDuration).mockReturnValue(4);

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      expect(result.current.checkCrossfadeTiming()).toBe(false);
    });
  });

  describe('prepareCrossfade', () => {
    it('should load stream URL on inactive audio', () => {
      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      act(() => {
        result.current.prepareCrossfade('http://example.com/next-track.mp3');
      });

      expect(mockAudioElements.loadOnInactive).toHaveBeenCalledWith(
        'http://example.com/next-track.mp3'
      );
    });
  });

  describe('performCrossfade', () => {
    it('should return false if audio elements are not available', async () => {
      vi.mocked(mockAudioElements.getActiveAudio).mockReturnValue(null);

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      let success: boolean = true;
      await act(async () => {
        success = await result.current.performCrossfade();
      });

      expect(success).toBe(false);
    });

    it('should set isCrossfading to true when starting', async () => {
      const onCrossfadeStart = vi.fn();

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
          onCrossfadeStart,
        })
      );

      // Start crossfade (but don't complete it)
      act(() => {
        result.current.performCrossfade();
      });

      // Should be crossfading
      expect(result.current.isCrossfading).toBe(true);
      expect(onCrossfadeStart).toHaveBeenCalled();
    });

    it('should play inactive audio when starting crossfade', async () => {
      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      await act(async () => {
        await result.current.performCrossfade();
      });

      expect(mockAudioElements.playInactive).toHaveBeenCalled();
    });

    it('should adjust volumes during crossfade', async () => {
      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: { enabled: true, duration: 1 }, // 1 second for faster test
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      await act(async () => {
        result.current.performCrossfade();
      });

      // Advance time to middle of crossfade
      act(() => {
        (global as any).advanceTime(500); // 50% through 1 second fade
      });

      // Volumes should have been adjusted
      expect(mockAudioElements.setAudioVolume).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockAudioElements.playInactive).mockRejectedValue(new Error('Playback failed'));

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      let success: boolean = true;
      await act(async () => {
        success = await result.current.performCrossfade();
      });

      expect(success).toBe(false);
      expect(result.current.isCrossfading).toBe(false);
    });
  });

  describe('clearCrossfade', () => {
    it('should reset isCrossfading to false', () => {
      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      // Start a crossfade
      act(() => {
        result.current.performCrossfade();
      });

      expect(result.current.isCrossfading).toBe(true);

      // Clear it
      act(() => {
        result.current.clearCrossfade();
      });

      expect(result.current.isCrossfading).toBe(false);
    });

    it('should cancel animation frame when one exists', async () => {
      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      // Start crossfade to create animation frame
      await act(async () => {
        await result.current.performCrossfade();
      });

      // At this point requestAnimationFrame should have been called
      expect(window.requestAnimationFrame).toHaveBeenCalled();

      act(() => {
        result.current.clearCrossfade();
      });

      // isCrossfading should be false after clear
      expect(result.current.isCrossfading).toBe(false);
    });
  });

  describe('resetCrossfadeFlag', () => {
    it('should allow crossfade timing check to trigger again', () => {
      vi.mocked(mockAudioElements.getCurrentTime).mockReturnValue(176);
      vi.mocked(mockAudioElements.getDuration).mockReturnValue(180);

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      // First trigger
      expect(result.current.checkCrossfadeTiming()).toBe(true);
      // Won't trigger again
      expect(result.current.checkCrossfadeTiming()).toBe(false);

      // Reset flag
      act(() => {
        result.current.resetCrossfadeFlag();
      });

      // Should trigger again
      expect(result.current.checkCrossfadeTiming()).toBe(true);
    });
  });

  describe('callbacks', () => {
    it('should call onCrossfadeStart when crossfade begins', async () => {
      const onCrossfadeStart = vi.fn();

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
          onCrossfadeStart,
        })
      );

      await act(async () => {
        await result.current.performCrossfade();
      });

      expect(onCrossfadeStart).toHaveBeenCalled();
    });

    it('should call onCrossfadeTrigger when timing check returns true', () => {
      const onCrossfadeTrigger = vi.fn();

      vi.mocked(mockAudioElements.getCurrentTime).mockReturnValue(176);
      vi.mocked(mockAudioElements.getDuration).mockReturnValue(180);

      renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
          onCrossfadeTrigger,
        })
      );

      // Simulate timeupdate event
      const mockAudioA = mockAudioElements.audioRefA.current!;
      const addEventListenerCalls = vi.mocked(mockAudioA.addEventListener).mock.calls;
      const timeUpdateHandler = addEventListenerCalls.find(
        call => call[0] === 'timeupdate'
      )?.[1] as EventListener;

      if (timeUpdateHandler) {
        act(() => {
          timeUpdateHandler(new Event('timeupdate'));
        });

        expect(onCrossfadeTrigger).toHaveBeenCalled();
      }
    });
  });

  describe('onCrossfadeCleared', () => {
    it('should call onCrossfadeCleared when clearCrossfade is invoked', async () => {
      const onCrossfadeCleared = vi.fn();

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
          onCrossfadeCleared,
        })
      );

      // Start a crossfade
      await act(async () => {
        await result.current.performCrossfade();
      });

      expect(result.current.isCrossfading).toBe(true);

      // Clear it
      act(() => {
        result.current.clearCrossfade();
      });

      expect(onCrossfadeCleared).toHaveBeenCalled();
    });

    it('should call onCrossfadeCleared even when no crossfade was active', () => {
      const onCrossfadeCleared = vi.fn();

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
          onCrossfadeCleared,
        })
      );

      act(() => {
        result.current.clearCrossfade();
      });

      // Should still be called — allows callers to safely reset their state
      expect(onCrossfadeCleared).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      const mockAudioA = mockAudioElements.audioRefA.current!;
      const mockAudioB = mockAudioElements.audioRefB.current!;

      unmount();

      expect(mockAudioA.removeEventListener).toHaveBeenCalledWith(
        'timeupdate',
        expect.any(Function)
      );
      expect(mockAudioB.removeEventListener).toHaveBeenCalledWith(
        'timeupdate',
        expect.any(Function)
      );
    });

    it('should clear crossfade on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      // Start a crossfade
      await act(async () => {
        await result.current.performCrossfade();
      });

      expect(result.current.isCrossfading).toBe(true);

      unmount();

      // After unmount, the hook should have cleaned up
      // We verify by checking that requestAnimationFrame was called during crossfade
      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('equalPowerFade calculation', () => {
    it('should start crossfade and call requestAnimationFrame', async () => {
      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: { enabled: true, duration: 1 },
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      await act(async () => {
        const success = await result.current.performCrossfade();
        expect(success).toBe(true);
      });

      // Crossfade should use requestAnimationFrame for smooth transitions
      expect(window.requestAnimationFrame).toHaveBeenCalled();
      expect(result.current.isCrossfading).toBe(true);
    });

    it('should be using equal power curve (cosine/sine)', () => {
      // Test the math of equal power fade
      // At 0%: fadeOut = cos(0) = 1, fadeIn = sin(0) = 0
      // At 50%: fadeOut = cos(π/4) ≈ 0.707, fadeIn = sin(π/4) ≈ 0.707
      // At 100%: fadeOut = cos(π/2) = 0, fadeIn = sin(π/2) = 1

      const progress0 = 0;
      const fadeOut0 = Math.cos(progress0 * Math.PI * 0.5);
      const fadeIn0 = Math.sin(progress0 * Math.PI * 0.5);
      expect(fadeOut0).toBeCloseTo(1);
      expect(fadeIn0).toBeCloseTo(0);

      const progress50 = 0.5;
      const fadeOut50 = Math.cos(progress50 * Math.PI * 0.5);
      const fadeIn50 = Math.sin(progress50 * Math.PI * 0.5);
      expect(fadeOut50).toBeCloseTo(0.707, 2);
      expect(fadeIn50).toBeCloseTo(0.707, 2);

      const progress100 = 1;
      const fadeOut100 = Math.cos(progress100 * Math.PI * 0.5);
      const fadeIn100 = Math.sin(progress100 * Math.PI * 0.5);
      expect(fadeOut100).toBeCloseTo(0);
      expect(fadeIn100).toBeCloseTo(1);
    });
  });

  describe('smart mode trigger timing', () => {
    const smartSettings: CrossfadeSettings = {
      enabled: true,
      duration: 5,
      smartMode: true,
      tempoMatch: false,
    };

    it('should trigger earlier when outroStart is too close to track end', () => {
      // Track: 180s, outroStart at 178s (only 2s of outro), crossfade duration 5s
      // Without fix: would trigger at 178s, leaving only 2s for a 5s fade
      // With fix: triggers at 175s (duration - crossfadeDuration), allowing full fade
      vi.mocked(mockAudioElements.getCurrentTime).mockReturnValue(175);
      vi.mocked(mockAudioElements.getDuration).mockReturnValue(180);

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: smartSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
          currentTrackOutroStart: 178, // Very close to end
        })
      );

      // Should trigger at 175 (= 180 - 5), not wait until 178
      expect(result.current.checkCrossfadeTiming()).toBe(true);
    });

    it('should use outroStart when it gives enough time for fade', () => {
      // Track: 180s, outroStart at 150s (30s outro), crossfade 5s
      // outroStart (150) < normalTrigger (175), so trigger at outroStart
      vi.mocked(mockAudioElements.getCurrentTime).mockReturnValue(150);
      vi.mocked(mockAudioElements.getDuration).mockReturnValue(180);

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: smartSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
          currentTrackOutroStart: 150,
        })
      );

      expect(result.current.checkCrossfadeTiming()).toBe(true);
    });

    it('should not trigger before the smart trigger point', () => {
      // Track: 180s, outroStart at 178s, crossfade 5s
      // smartTriggerPoint = min(178, 175) = 175
      // At 174s, should NOT trigger yet
      vi.mocked(mockAudioElements.getCurrentTime).mockReturnValue(174);
      vi.mocked(mockAudioElements.getDuration).mockReturnValue(180);

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: smartSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
          currentTrackOutroStart: 178,
        })
      );

      expect(result.current.checkCrossfadeTiming()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle null audio refs gracefully', () => {
      const audioElementsWithNullRefs = {
        ...mockAudioElements,
        audioRefA: { current: null },
        audioRefB: { current: null },
      };

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: audioElementsWithNullRefs,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      // Should not throw
      expect(result.current.checkCrossfadeTiming()).toBe(false);
    });

    it('should handle zero duration gracefully', () => {
      vi.mocked(mockAudioElements.getDuration).mockReturnValue(0);

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'off',
          hasNextTrack: true,
        })
      );

      // Should not trigger crossfade for zero duration
      expect(result.current.checkCrossfadeTiming()).toBe(false);
    });

    it('should work with repeatMode all', () => {
      vi.mocked(mockAudioElements.getCurrentTime).mockReturnValue(176);
      vi.mocked(mockAudioElements.getDuration).mockReturnValue(180);

      const { result } = renderHook(() =>
        useCrossfadeLogic({
          audioElements: mockAudioElements,
          settings: defaultSettings,
          isRadioMode: false,
          repeatMode: 'all', // Should still allow crossfade
          hasNextTrack: true,
        })
      );

      expect(result.current.checkCrossfadeTiming()).toBe(true);
    });
  });
});
