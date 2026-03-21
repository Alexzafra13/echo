import { useRef, useEffect, useCallback, useState } from 'react';
import { logger } from '@shared/utils/logger';

export interface AudioElementsState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export interface AudioElementsCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onError?: (error: Event) => void;
  onWaiting?: () => void;
  onPlaying?: () => void;
  onStalled?: () => void;
}

interface UseAudioElementsOptions {
  initialVolume?: number;
  callbacks?: AudioElementsCallbacks;
}

/**
 * Detect whether HTMLAudioElement.volume is writable.
 * On iOS Safari it's read-only (always 1.0) — volume is hardware-only.
 */
function detectVolumeControl(): boolean {
  try {
    const test = new Audio();
    test.volume = 0.5;
    return test.volume === 0.5;
  } catch {
    return false;
  }
}

/**
 * Hook for managing dual audio elements with crossfade support.
 * Uses HTMLAudioElement.volume directly for volume control.
 * On iOS (where volume is read-only), crossfade still works as overlap
 * (both tracks play at full volume, then the old one stops).
 *
 * No Web Audio API (AudioContext/GainNode) — this ensures background
 * playback works on iOS, which suspends AudioContext when backgrounded.
 */
export function useAudioElements(options: UseAudioElementsOptions = {}) {
  const { initialVolume = 0.7, callbacks } = options;

  // Audio element refs
  const audioRefA = useRef<HTMLAudioElement | null>(null);
  const audioRefB = useRef<HTMLAudioElement | null>(null);
  const activeAudioRef = useRef<'A' | 'B'>('A');

  // Store callbacks in ref to avoid effect re-runs
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Volume state (needed for crossfade calculations)
  const [volume, setVolumeState] = useState(initialVolume);

  // Whether the browser supports programmatic volume control
  const [volumeControlSupported] = useState(() => detectVolumeControl());

  /**
   * Get the currently active audio element
   */
  const getActiveAudio = useCallback((): HTMLAudioElement | null => {
    return activeAudioRef.current === 'A' ? audioRefA.current : audioRefB.current;
  }, []);

  /**
   * Get the inactive (secondary) audio element
   */
  const getInactiveAudio = useCallback((): HTMLAudioElement | null => {
    return activeAudioRef.current === 'A' ? audioRefB.current : audioRefA.current;
  }, []);

  /**
   * Get which audio element is currently active
   */
  const getActiveAudioId = useCallback((): 'A' | 'B' => {
    return activeAudioRef.current;
  }, []);

  /**
   * Switch which audio element is active
   * Also updates duration/time callbacks to reflect the new active audio
   */
  const switchActiveAudio = useCallback(() => {
    activeAudioRef.current = activeAudioRef.current === 'A' ? 'B' : 'A';
    const newId = activeAudioRef.current;
    logger.debug('[AudioElements] Switched to audio:', newId);

    // Immediately update duration and time for the newly active audio
    const newActiveAudio = newId === 'A' ? audioRefA.current : audioRefB.current;
    if (newActiveAudio) {
      if (!isNaN(newActiveAudio.duration) && newActiveAudio.duration > 0) {
        callbacksRef.current?.onDurationChange?.(newActiveAudio.duration);
      }
      callbacksRef.current?.onTimeUpdate?.(newActiveAudio.currentTime);
    }

    return newId;
  }, []);

  /**
   * Reset to audio A as active
   */
  const resetToAudioA = useCallback(() => {
    activeAudioRef.current = 'A';
  }, []);

  /**
   * Set volume on both audio elements.
   * On iOS (volume read-only), this is a no-op — volume is hardware-controlled.
   */
  const setVolume = useCallback((newVolume: number) => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;
    if (audioA) audioA.volume = newVolume;
    if (audioB) audioB.volume = newVolume;
    setVolumeState(newVolume);
  }, []);

  /**
   * Set volume on a specific audio element (for crossfade).
   * On iOS (volume read-only), this is a no-op — crossfade is overlap-only.
   */
  const setAudioVolume = useCallback(
    (audioId: 'A' | 'B', newVolume: number) => {
      const audio = audioId === 'A' ? audioRefA.current : audioRefB.current;
      if (audio) audio.volume = newVolume;
    },
    []
  );

  /**
   * Load a source on the active audio element
   */
  const loadOnActive = useCallback(
    (src: string) => {
      const audio = getActiveAudio();
      if (audio) {
        audio.src = src;
        audio.load();
      }
    },
    [getActiveAudio]
  );

  /**
   * Load a source on the inactive audio element (for crossfade preloading).
   * Sets volume to 0 to prevent sound until crossfade starts.
   * On iOS (volume read-only), the audio will be muted instead.
   */
  const loadOnInactive = useCallback(
    (src: string) => {
      const audio = getInactiveAudio();
      if (audio) {
        audio.src = src;
        audio.volume = 0;
        // On iOS where volume is read-only, mute to prevent audible preload
        if (!volumeControlSupported) {
          audio.muted = true;
        }
        audio.load();
      }
    },
    [getInactiveAudio, volumeControlSupported]
  );

  /**
   * Wait for audio to be ready to play without interruption
   */
  const waitForAudioReady = useCallback(
    (audio: HTMLAudioElement, timeout: number = 3000): Promise<boolean> => {
      return new Promise((resolve) => {
        if (audio.readyState >= 4) {
          resolve(true);
          return;
        }

        const cleanup = () => {
          audio.removeEventListener('canplaythrough', handleCanPlayThrough);
          audio.removeEventListener('error', handleError);
          clearTimeout(timeoutId);
        };

        const handleCanPlayThrough = () => {
          cleanup();
          resolve(true);
        };

        const handleError = () => {
          cleanup();
          resolve(false);
        };

        const timeoutId = window.setTimeout(() => {
          cleanup();
          resolve(true);
        }, timeout);

        audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
        audio.addEventListener('error', handleError, { once: true });
      });
    },
    []
  );

  /**
   * Play the active audio element, waiting for buffer if needed.
   */
  const playActive = useCallback(
    async (waitForBuffer: boolean = true) => {
      const audio = getActiveAudio();
      if (audio) {
        try {
          if (waitForBuffer) {
            await waitForAudioReady(audio);
          }
          await audio.play();
        } catch (error) {
          logger.error('[AudioElements] Failed to play:', (error as Error).message);
          throw error;
        }
      }
    },
    [getActiveAudio, waitForAudioReady]
  );

  /**
   * Play the inactive audio element (for crossfade), waiting for buffer if needed.
   */
  const playInactive = useCallback(
    async (waitForBuffer: boolean = true) => {
      const audio = getInactiveAudio();
      if (audio) {
        // Unmute if it was muted during preload (iOS path)
        audio.muted = false;
        try {
          if (waitForBuffer) {
            await waitForAudioReady(audio);
          }
          await audio.play();
        } catch (error) {
          logger.error('[AudioElements] Failed to play inactive:', (error as Error).message);
          throw error;
        }
      }
    },
    [getInactiveAudio, waitForAudioReady]
  );

  /**
   * Pause the active audio element
   */
  const pauseActive = useCallback(() => {
    const audio = getActiveAudio();
    audio?.pause();
  }, [getActiveAudio]);

  /**
   * Pause both audio elements
   */
  const pauseBoth = useCallback(() => {
    audioRefA.current?.pause();
    audioRefB.current?.pause();
  }, []);

  /**
   * Fade out an audio element via volume ramp to prevent clicks/pops.
   * On iOS (volume read-only), resolves immediately (hard cut).
   */
  const fadeOutAudio = useCallback(
    (audio: HTMLAudioElement, duration: number = 50): Promise<void> => {
      return new Promise((resolve) => {
        if (!audio || audio.paused) {
          resolve();
          return;
        }

        const startVolume = audio.volume;
        if (startVolume === 0) {
          resolve();
          return;
        }

        const startTime = performance.now();

        const animateFadeOut = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(1, elapsed / duration);

          audio.volume = startVolume * (1 - progress);

          if (progress < 1) {
            requestAnimationFrame(animateFadeOut);
          } else {
            audio.volume = 0;
            resolve();
          }
        };

        requestAnimationFrame(animateFadeOut);
      });
    },
    []
  );

  /**
   * Stop and clear both audio elements with fade-out to prevent pops
   */
  const stopBoth = useCallback(async () => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;

    await Promise.all([
      audioA ? fadeOutAudio(audioA, 50) : Promise.resolve(),
      audioB ? fadeOutAudio(audioB, 50) : Promise.resolve(),
    ]);

    if (audioA) {
      audioA.pause();
      audioA.currentTime = 0;
      audioA.src = '';
    }
    if (audioB) {
      audioB.pause();
      audioB.currentTime = 0;
      audioB.src = '';
    }

    activeAudioRef.current = 'A';
  }, [fadeOutAudio]);

  /**
   * Stop and clear the active audio element with optional fade-out
   */
  const stopActive = useCallback(
    async (withFade: boolean = false) => {
      const audio = getActiveAudio();
      if (audio) {
        if (withFade && !audio.paused) {
          await fadeOutAudio(audio, 50);
        }
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
      }
    },
    [getActiveAudio, fadeOutAudio]
  );

  /**
   * Stop and clear the inactive audio element with optional fade-out
   */
  const stopInactive = useCallback(
    async (withFade: boolean = false) => {
      const audio = getInactiveAudio();
      if (audio) {
        if (withFade && !audio.paused) {
          await fadeOutAudio(audio, 50);
        }
        audio.pause();
        audio.currentTime = 0;
      }
    },
    [getInactiveAudio, fadeOutAudio]
  );

  /**
   * Seek to a specific time on the active audio
   */
  const seek = useCallback(
    (time: number) => {
      const audio = getActiveAudio();
      if (audio) {
        audio.currentTime = time;
      }
    },
    [getActiveAudio]
  );

  /**
   * Get current time of active audio
   */
  const getCurrentTime = useCallback((): number => {
    return getActiveAudio()?.currentTime || 0;
  }, [getActiveAudio]);

  /**
   * Get duration of active audio
   */
  const getDuration = useCallback((): number => {
    return getActiveAudio()?.duration || 0;
  }, [getActiveAudio]);

  /**
   * Check if both audios are paused
   */
  const areBothPaused = useCallback((): boolean => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;
    return (audioA?.paused ?? true) && (audioB?.paused ?? true);
  }, []);

  // Initialize audio elements and event listeners
  useEffect(() => {
    const audioA = new Audio();
    audioA.volume = initialVolume;
    audioRefA.current = audioA;

    const audioB = new Audio();
    audioB.volume = initialVolume;
    audioRefB.current = audioB;

    logger.debug('[AudioElements] Initialized — direct HTMLAudioElement output (no Web Audio API)');

    // Shared handlers (same for both elements)
    const handlePlay = () => callbacksRef.current?.onPlay?.();
    const handleError = (e: Event) => callbacksRef.current?.onError?.(e);
    const handleWaiting = () => callbacksRef.current?.onWaiting?.();
    const handlePlaying = () => callbacksRef.current?.onPlaying?.();
    const handleStalled = () => callbacksRef.current?.onStalled?.();

    const handlePause = () => {
      // Only trigger pause callback if both audios are paused (for crossfade support).
      // Skip if the active audio ended naturally — per HTML5 spec, 'pause' fires
      // BEFORE 'ended'. Without this guard, isPlaying flickers to false, MediaSession
      // reports 'paused', and on mobile PWA the OS revokes audio focus.
      if (audioA.paused && audioB.paused) {
        const activeAudio = activeAudioRef.current === 'A' ? audioA : audioB;
        if (activeAudio.ended) return;
        callbacksRef.current?.onPause?.();
      }
    };

    const elements: Array<{ audio: HTMLAudioElement; id: 'A' | 'B' }> = [
      { audio: audioA, id: 'A' },
      { audio: audioB, id: 'B' },
    ];

    const perElementHandlers = elements.map(({ audio, id }) => {
      const handlers: Array<[string, EventListener]> = [
        [
          'timeupdate',
          () => {
            if (activeAudioRef.current === id)
              callbacksRef.current?.onTimeUpdate?.(audio.currentTime);
          },
        ],
        [
          'loadedmetadata',
          () => {
            if (activeAudioRef.current === id)
              callbacksRef.current?.onDurationChange?.(audio.duration);
          },
        ],
        [
          'ended',
          () => {
            if (activeAudioRef.current === id) callbacksRef.current?.onEnded?.();
          },
        ],
        ['play', handlePlay],
        ['pause', handlePause],
        ['error', handleError],
        ['waiting', handleWaiting],
        ['playing', handlePlaying],
        ['stalled', handleStalled],
      ];

      for (const [event, handler] of handlers) {
        audio.addEventListener(event, handler);
      }

      return { audio, handlers };
    });

    return () => {
      for (const { audio, handlers } of perElementHandlers) {
        for (const [event, handler] of handlers) {
          audio.removeEventListener(event, handler);
        }
        audio.pause();
        audio.src = '';
        audio.load();
      }
      audioRefA.current = null;
      audioRefB.current = null;
    };
  }, [initialVolume]);

  return {
    // Refs (for direct access if needed)
    audioRefA,
    audioRefB,
    activeAudioRef,

    // State
    volume,
    volumeControlSupported,

    // Getters
    getActiveAudio,
    getInactiveAudio,
    getActiveAudioId,
    getCurrentTime,
    getDuration,
    areBothPaused,

    // Actions
    switchActiveAudio,
    resetToAudioA,
    setVolume,
    setAudioVolume,
    loadOnActive,
    loadOnInactive,
    playActive,
    playInactive,
    pauseActive,
    pauseBoth,
    stopBoth,
    stopActive,
    stopInactive,
    seek,

    // Audio utilities for smooth transitions
    waitForAudioReady,
    fadeOutAudio,
  };
}

export type AudioElements = ReturnType<typeof useAudioElements>;
