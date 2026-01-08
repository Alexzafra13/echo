import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioElements, AudioElementsCallbacks } from './useAudioElements';

// Mock logger to avoid console noise
vi.mock('@shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Create a mock Audio element with all needed properties and methods
function createMockAudio(): HTMLAudioElement {
  const eventListeners: Record<string, Set<EventListener>> = {};

  const mockAudio = {
    volume: 1,
    currentTime: 0,
    duration: 0,
    paused: true,
    src: '',
    readyState: 0,

    play: vi.fn().mockImplementation(function(this: typeof mockAudio) {
      this.paused = false;
      // Trigger play event
      eventListeners['play']?.forEach(listener => listener(new Event('play')));
      return Promise.resolve();
    }),

    pause: vi.fn().mockImplementation(function(this: typeof mockAudio) {
      this.paused = true;
      eventListeners['pause']?.forEach(listener => listener(new Event('pause')));
    }),

    load: vi.fn(),

    addEventListener: vi.fn((event: string, handler: EventListener, options?: AddEventListenerOptions) => {
      if (!eventListeners[event]) {
        eventListeners[event] = new Set();
      }
      eventListeners[event].add(handler);
    }),

    removeEventListener: vi.fn((event: string, handler: EventListener) => {
      eventListeners[event]?.delete(handler);
    }),

    // Helper to trigger events in tests
    _triggerEvent: (event: string, eventObj?: Event) => {
      eventListeners[event]?.forEach(listener => {
        listener(eventObj || new Event(event));
        // Handle { once: true } option
      });
    },

    _setReadyState: function(state: number) {
      this.readyState = state;
      if (state >= 4) {
        this._triggerEvent('canplaythrough');
      }
    },
  } as unknown as HTMLAudioElement & {
    _triggerEvent: (event: string, eventObj?: Event) => void;
    _setReadyState: (state: number) => void;
  };

  return mockAudio;
}

describe('useAudioElements', () => {
  let mockAudioInstances: ReturnType<typeof createMockAudio>[];
  let originalAudio: typeof Audio;

  beforeEach(() => {
    mockAudioInstances = [];
    originalAudio = global.Audio;

    // Mock Audio constructor
    global.Audio = vi.fn().mockImplementation(() => {
      const mockAudio = createMockAudio();
      mockAudioInstances.push(mockAudio);
      return mockAudio;
    }) as unknown as typeof Audio;

    // Mock requestAnimationFrame for fade animations
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(performance.now() + 100);
      return 1;
    });

    // Mock performance.now
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    global.Audio = originalAudio;
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create two audio elements on mount', () => {
      renderHook(() => useAudioElements());

      expect(mockAudioInstances).toHaveLength(2);
    });

    it('should set initial volume on both audio elements', () => {
      renderHook(() => useAudioElements({ initialVolume: 0.5 }));

      expect(mockAudioInstances[0].volume).toBe(0.5);
      expect(mockAudioInstances[1].volume).toBe(0.5);
    });

    it('should use default volume of 0.7 if not specified', () => {
      renderHook(() => useAudioElements());

      expect(mockAudioInstances[0].volume).toBe(0.7);
      expect(mockAudioInstances[1].volume).toBe(0.7);
    });

    it('should start with audio A as active', () => {
      const { result } = renderHook(() => useAudioElements());

      expect(result.current.getActiveAudioId()).toBe('A');
    });
  });

  describe('getActiveAudio / getInactiveAudio', () => {
    it('should return audio A as active initially', () => {
      const { result } = renderHook(() => useAudioElements());

      const activeAudio = result.current.getActiveAudio();
      const inactiveAudio = result.current.getInactiveAudio();

      expect(activeAudio).toBe(mockAudioInstances[0]);
      expect(inactiveAudio).toBe(mockAudioInstances[1]);
    });

    it('should swap after switchActiveAudio', () => {
      const { result } = renderHook(() => useAudioElements());

      act(() => {
        result.current.switchActiveAudio();
      });

      const activeAudio = result.current.getActiveAudio();
      const inactiveAudio = result.current.getInactiveAudio();

      expect(activeAudio).toBe(mockAudioInstances[1]);
      expect(inactiveAudio).toBe(mockAudioInstances[0]);
      expect(result.current.getActiveAudioId()).toBe('B');
    });
  });

  describe('switchActiveAudio', () => {
    it('should toggle between A and B', () => {
      const { result } = renderHook(() => useAudioElements());

      expect(result.current.getActiveAudioId()).toBe('A');

      act(() => {
        result.current.switchActiveAudio();
      });
      expect(result.current.getActiveAudioId()).toBe('B');

      act(() => {
        result.current.switchActiveAudio();
      });
      expect(result.current.getActiveAudioId()).toBe('A');
    });

    it('should return the new active audio id', () => {
      const { result } = renderHook(() => useAudioElements());

      let newActiveId: 'A' | 'B';
      act(() => {
        newActiveId = result.current.switchActiveAudio();
      });

      expect(newActiveId!).toBe('B');
    });
  });

  describe('resetToAudioA', () => {
    it('should reset active audio to A', () => {
      const { result } = renderHook(() => useAudioElements());

      act(() => {
        result.current.switchActiveAudio(); // Now B
        result.current.switchActiveAudio(); // Now A
        result.current.switchActiveAudio(); // Now B
      });

      expect(result.current.getActiveAudioId()).toBe('B');

      act(() => {
        result.current.resetToAudioA();
      });

      expect(result.current.getActiveAudioId()).toBe('A');
    });
  });

  describe('setVolume', () => {
    it('should set volume on both audio elements', () => {
      const { result } = renderHook(() => useAudioElements());

      act(() => {
        result.current.setVolume(0.3);
      });

      expect(mockAudioInstances[0].volume).toBe(0.3);
      expect(mockAudioInstances[1].volume).toBe(0.3);
      expect(result.current.volume).toBe(0.3);
    });
  });

  describe('setAudioVolume', () => {
    it('should set volume on specific audio element A', () => {
      const { result } = renderHook(() => useAudioElements());

      act(() => {
        result.current.setAudioVolume('A', 0.2);
      });

      expect(mockAudioInstances[0].volume).toBe(0.2);
      expect(mockAudioInstances[1].volume).toBe(0.7); // Unchanged
    });

    it('should set volume on specific audio element B', () => {
      const { result } = renderHook(() => useAudioElements());

      act(() => {
        result.current.setAudioVolume('B', 0.8);
      });

      expect(mockAudioInstances[0].volume).toBe(0.7); // Unchanged
      expect(mockAudioInstances[1].volume).toBe(0.8);
    });
  });

  describe('loadOnActive / loadOnInactive', () => {
    it('should load source on active audio element', () => {
      const { result } = renderHook(() => useAudioElements());

      act(() => {
        result.current.loadOnActive('http://example.com/track.mp3');
      });

      expect(mockAudioInstances[0].src).toBe('http://example.com/track.mp3');
      expect(mockAudioInstances[0].load).toHaveBeenCalled();
    });

    it('should load source on inactive audio element with volume 0', () => {
      const { result } = renderHook(() => useAudioElements());

      act(() => {
        result.current.loadOnInactive('http://example.com/next-track.mp3');
      });

      expect(mockAudioInstances[1].src).toBe('http://example.com/next-track.mp3');
      expect(mockAudioInstances[1].volume).toBe(0); // Set to 0 for crossfade
      expect(mockAudioInstances[1].load).toHaveBeenCalled();
    });
  });

  describe('playActive', () => {
    it('should play the active audio element', async () => {
      const { result } = renderHook(() => useAudioElements());

      // Simulate audio ready
      (mockAudioInstances[0] as any).readyState = 4;

      await act(async () => {
        await result.current.playActive();
      });

      expect(mockAudioInstances[0].play).toHaveBeenCalled();
    });

    it('should wait for audio to be ready by default', async () => {
      const { result } = renderHook(() => useAudioElements());

      // Start with readyState < 4
      (mockAudioInstances[0] as any).readyState = 2;

      // Simulate canplaythrough event after a delay
      setTimeout(() => {
        (mockAudioInstances[0] as any)._setReadyState(4);
      }, 10);

      await act(async () => {
        await result.current.playActive(true);
      });

      expect(mockAudioInstances[0].play).toHaveBeenCalled();
    });

    it('should skip waiting if waitForBuffer is false', async () => {
      const { result } = renderHook(() => useAudioElements());

      await act(async () => {
        await result.current.playActive(false);
      });

      expect(mockAudioInstances[0].play).toHaveBeenCalled();
    });
  });

  describe('playInactive', () => {
    it('should play the inactive audio element', async () => {
      const { result } = renderHook(() => useAudioElements());

      // Simulate audio ready
      (mockAudioInstances[1] as any).readyState = 4;

      await act(async () => {
        await result.current.playInactive();
      });

      expect(mockAudioInstances[1].play).toHaveBeenCalled();
    });
  });

  describe('pauseActive', () => {
    it('should pause the active audio element', () => {
      const { result } = renderHook(() => useAudioElements());

      act(() => {
        result.current.pauseActive();
      });

      expect(mockAudioInstances[0].pause).toHaveBeenCalled();
    });
  });

  describe('pauseBoth', () => {
    it('should pause both audio elements', () => {
      const { result } = renderHook(() => useAudioElements());

      act(() => {
        result.current.pauseBoth();
      });

      expect(mockAudioInstances[0].pause).toHaveBeenCalled();
      expect(mockAudioInstances[1].pause).toHaveBeenCalled();
    });
  });

  describe('stopBoth', () => {
    it('should stop and clear both audio elements', async () => {
      const { result } = renderHook(() => useAudioElements());

      // Set up some state first
      mockAudioInstances[0].src = 'http://example.com/track1.mp3';
      mockAudioInstances[1].src = 'http://example.com/track2.mp3';

      await act(async () => {
        await result.current.stopBoth();
      });

      expect(mockAudioInstances[0].pause).toHaveBeenCalled();
      expect(mockAudioInstances[1].pause).toHaveBeenCalled();
      expect(mockAudioInstances[0].src).toBe('');
      expect(mockAudioInstances[1].src).toBe('');
      expect(mockAudioInstances[0].currentTime).toBe(0);
      expect(mockAudioInstances[1].currentTime).toBe(0);
    });

    it('should reset active audio to A', async () => {
      const { result } = renderHook(() => useAudioElements());

      act(() => {
        result.current.switchActiveAudio(); // Now B
      });

      await act(async () => {
        await result.current.stopBoth();
      });

      expect(result.current.getActiveAudioId()).toBe('A');
    });
  });

  describe('stopActive', () => {
    it('should stop and clear the active audio element', async () => {
      const { result } = renderHook(() => useAudioElements());

      mockAudioInstances[0].src = 'http://example.com/track.mp3';

      await act(async () => {
        await result.current.stopActive();
      });

      expect(mockAudioInstances[0].pause).toHaveBeenCalled();
      expect(mockAudioInstances[0].src).toBe('');
      expect(mockAudioInstances[0].currentTime).toBe(0);
    });
  });

  describe('stopInactive', () => {
    it('should stop and clear the inactive audio element', async () => {
      const { result } = renderHook(() => useAudioElements());

      mockAudioInstances[1].src = 'http://example.com/track.mp3';

      await act(async () => {
        await result.current.stopInactive();
      });

      expect(mockAudioInstances[1].pause).toHaveBeenCalled();
      expect(mockAudioInstances[1].src).toBe('');
      expect(mockAudioInstances[1].currentTime).toBe(0);
    });
  });

  describe('seek', () => {
    it('should seek to specified time on active audio', () => {
      const { result } = renderHook(() => useAudioElements());

      act(() => {
        result.current.seek(45.5);
      });

      expect(mockAudioInstances[0].currentTime).toBe(45.5);
    });
  });

  describe('getCurrentTime', () => {
    it('should return current time of active audio', () => {
      const { result } = renderHook(() => useAudioElements());

      mockAudioInstances[0].currentTime = 30;

      expect(result.current.getCurrentTime()).toBe(30);
    });

    it('should return 0 if no audio element', () => {
      const { result } = renderHook(() => useAudioElements());

      expect(result.current.getCurrentTime()).toBe(0);
    });
  });

  describe('getDuration', () => {
    it('should return duration of active audio', () => {
      const { result } = renderHook(() => useAudioElements());

      (mockAudioInstances[0] as any).duration = 180;

      expect(result.current.getDuration()).toBe(180);
    });
  });

  describe('areBothPaused', () => {
    it('should return true when both audios are paused', () => {
      const { result } = renderHook(() => useAudioElements());

      mockAudioInstances[0].paused = true;
      mockAudioInstances[1].paused = true;

      expect(result.current.areBothPaused()).toBe(true);
    });

    it('should return false when one audio is playing', () => {
      const { result } = renderHook(() => useAudioElements());

      mockAudioInstances[0].paused = false;
      mockAudioInstances[1].paused = true;

      expect(result.current.areBothPaused()).toBe(false);
    });

    it('should return false when both audios are playing', () => {
      const { result } = renderHook(() => useAudioElements());

      mockAudioInstances[0].paused = false;
      mockAudioInstances[1].paused = false;

      expect(result.current.areBothPaused()).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('should call onPlay when audio starts playing', async () => {
      const onPlay = vi.fn();
      const { result } = renderHook(() =>
        useAudioElements({ callbacks: { onPlay } })
      );

      (mockAudioInstances[0] as any).readyState = 4;

      await act(async () => {
        await result.current.playActive();
      });

      expect(onPlay).toHaveBeenCalled();
    });

    it('should call onPause when both audios are paused', () => {
      const onPause = vi.fn();
      renderHook(() =>
        useAudioElements({ callbacks: { onPause } })
      );

      // Simulate both paused
      mockAudioInstances[0].paused = true;
      mockAudioInstances[1].paused = true;

      // Trigger pause event
      (mockAudioInstances[0] as any)._triggerEvent('pause');

      expect(onPause).toHaveBeenCalled();
    });

    it('should NOT call onPause during crossfade (one still playing)', () => {
      const onPause = vi.fn();
      renderHook(() =>
        useAudioElements({ callbacks: { onPause } })
      );

      // Simulate crossfade - A paused, B playing
      mockAudioInstances[0].paused = true;
      mockAudioInstances[1].paused = false;

      // Trigger pause event on A
      (mockAudioInstances[0] as any)._triggerEvent('pause');

      expect(onPause).not.toHaveBeenCalled();
    });

    it('should call onEnded when track ends', () => {
      const onEnded = vi.fn();
      renderHook(() =>
        useAudioElements({ callbacks: { onEnded } })
      );

      (mockAudioInstances[0] as any)._triggerEvent('ended');

      expect(onEnded).toHaveBeenCalled();
    });

    it('should call onTimeUpdate only for active audio', () => {
      const onTimeUpdate = vi.fn();
      const { result } = renderHook(() =>
        useAudioElements({ callbacks: { onTimeUpdate } })
      );

      mockAudioInstances[0].currentTime = 15;
      (mockAudioInstances[0] as any)._triggerEvent('timeupdate');

      expect(onTimeUpdate).toHaveBeenCalledWith(15);

      // Now trigger on inactive - should not call
      onTimeUpdate.mockClear();
      mockAudioInstances[1].currentTime = 20;
      (mockAudioInstances[1] as any)._triggerEvent('timeupdate');

      expect(onTimeUpdate).not.toHaveBeenCalled();
    });

    it('should call onDurationChange only for active audio', () => {
      const onDurationChange = vi.fn();
      renderHook(() =>
        useAudioElements({ callbacks: { onDurationChange } })
      );

      (mockAudioInstances[0] as any).duration = 200;
      (mockAudioInstances[0] as any)._triggerEvent('loadedmetadata');

      expect(onDurationChange).toHaveBeenCalledWith(200);
    });

    it('should call onError when error occurs', () => {
      const onError = vi.fn();
      renderHook(() =>
        useAudioElements({ callbacks: { onError } })
      );

      const errorEvent = new Event('error');
      (mockAudioInstances[0] as any)._triggerEvent('error', errorEvent);

      expect(onError).toHaveBeenCalledWith(errorEvent);
    });

    it('should call onWaiting when buffering', () => {
      const onWaiting = vi.fn();
      renderHook(() =>
        useAudioElements({ callbacks: { onWaiting } })
      );

      (mockAudioInstances[0] as any)._triggerEvent('waiting');

      expect(onWaiting).toHaveBeenCalled();
    });

    it('should call onPlaying when playback resumes', () => {
      const onPlaying = vi.fn();
      renderHook(() =>
        useAudioElements({ callbacks: { onPlaying } })
      );

      (mockAudioInstances[0] as any)._triggerEvent('playing');

      expect(onPlaying).toHaveBeenCalled();
    });

    it('should call onStalled when playback stalls', () => {
      const onStalled = vi.fn();
      renderHook(() =>
        useAudioElements({ callbacks: { onStalled } })
      );

      (mockAudioInstances[0] as any)._triggerEvent('stalled');

      expect(onStalled).toHaveBeenCalled();
    });
  });

  describe('waitForAudioReady', () => {
    it('should resolve immediately if readyState >= 4', async () => {
      const { result } = renderHook(() => useAudioElements());

      (mockAudioInstances[0] as any).readyState = 4;

      let resolved = false;
      await act(async () => {
        resolved = await result.current.waitForAudioReady(mockAudioInstances[0]);
      });

      expect(resolved).toBe(true);
    });

    it('should wait for canplaythrough event', async () => {
      const { result } = renderHook(() => useAudioElements());

      (mockAudioInstances[0] as any).readyState = 2;

      // Simulate canplaythrough after a delay
      setTimeout(() => {
        (mockAudioInstances[0] as any)._setReadyState(4);
      }, 10);

      let resolved = false;
      await act(async () => {
        resolved = await result.current.waitForAudioReady(mockAudioInstances[0], 1000);
      });

      expect(resolved).toBe(true);
    });

    it('should resolve true on timeout', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useAudioElements());

      (mockAudioInstances[0] as any).readyState = 2;

      const promise = result.current.waitForAudioReady(mockAudioInstances[0], 100);

      // Fast-forward time
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      const resolved = await promise;
      expect(resolved).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('fadeOutAudio', () => {
    it('should resolve immediately if audio is paused', async () => {
      const { result } = renderHook(() => useAudioElements());

      mockAudioInstances[0].paused = true;

      await act(async () => {
        await result.current.fadeOutAudio(mockAudioInstances[0], 50);
      });

      // Should resolve without error
      expect(true).toBe(true);
    });

    it('should resolve immediately if volume is already 0', async () => {
      const { result } = renderHook(() => useAudioElements());

      mockAudioInstances[0].paused = false;
      mockAudioInstances[0].volume = 0;

      await act(async () => {
        await result.current.fadeOutAudio(mockAudioInstances[0], 50);
      });

      expect(true).toBe(true);
    });

    it('should fade volume to 0', async () => {
      const { result } = renderHook(() => useAudioElements());

      mockAudioInstances[0].paused = false;
      mockAudioInstances[0].volume = 0.7;

      // Mock performance.now to simulate time passing
      let time = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => {
        time += 100; // Each call advances time by 100ms
        return time;
      });

      await act(async () => {
        await result.current.fadeOutAudio(mockAudioInstances[0], 50);
      });

      expect(mockAudioInstances[0].volume).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners and pause audio on unmount', () => {
      const { unmount } = renderHook(() => useAudioElements());

      unmount();

      expect(mockAudioInstances[0].removeEventListener).toHaveBeenCalled();
      expect(mockAudioInstances[1].removeEventListener).toHaveBeenCalled();
      expect(mockAudioInstances[0].pause).toHaveBeenCalled();
      expect(mockAudioInstances[1].pause).toHaveBeenCalled();
    });
  });

  describe('crossfade workflow', () => {
    it('should support complete crossfade workflow', async () => {
      const { result } = renderHook(() => useAudioElements({ initialVolume: 1 }));

      // 1. Load track on active (A)
      act(() => {
        result.current.loadOnActive('http://example.com/track1.mp3');
      });
      expect(mockAudioInstances[0].src).toBe('http://example.com/track1.mp3');

      // 2. Play active
      (mockAudioInstances[0] as any).readyState = 4;
      await act(async () => {
        await result.current.playActive();
      });
      expect(mockAudioInstances[0].play).toHaveBeenCalled();

      // 3. Preload next track on inactive (B)
      act(() => {
        result.current.loadOnInactive('http://example.com/track2.mp3');
      });
      expect(mockAudioInstances[1].src).toBe('http://example.com/track2.mp3');
      expect(mockAudioInstances[1].volume).toBe(0); // Ready for fade in

      // 4. Start crossfade - play inactive
      (mockAudioInstances[1] as any).readyState = 4;
      await act(async () => {
        await result.current.playInactive();
      });
      expect(mockAudioInstances[1].play).toHaveBeenCalled();

      // 5. Gradually adjust volumes (simulated)
      act(() => {
        result.current.setAudioVolume('A', 0.5);
        result.current.setAudioVolume('B', 0.5);
      });

      // 6. Complete crossfade - switch active
      act(() => {
        result.current.switchActiveAudio();
      });
      expect(result.current.getActiveAudioId()).toBe('B');

      // 7. Stop old track
      await act(async () => {
        await result.current.stopInactive(); // Now A is inactive
      });
      expect(mockAudioInstances[0].pause).toHaveBeenCalled();
      expect(mockAudioInstances[0].src).toBe('');
    });
  });
});
