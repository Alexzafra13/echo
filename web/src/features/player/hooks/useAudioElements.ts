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

// Minimal silent WAV (1 sample, 44.1kHz, 16-bit mono) for iOS autoplay warmup.
// iOS Safari requires each HTMLAudioElement to receive a play() call from a user
// gesture before allowing programmatic play(). We load this on Audio B and briefly
// play/pause it during the first user-initiated playActive(), so that subsequent
// crossfade play() calls (from timeupdate handler) succeed without user gesture.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

/**
 * Hook for managing dual audio elements with crossfade support.
 * Uses Web Audio API (AudioContext + GainNode) for volume control,
 * enabling crossfade on ALL platforms including iOS Safari where
 * HTMLAudioElement.volume is read-only.
 *
 * Audio routing: HTMLAudioElement → MediaElementSourceNode → GainNode → destination
 */
export function useAudioElements(options: UseAudioElementsOptions = {}) {
  const { initialVolume = 0.7, callbacks } = options;

  // Audio element refs
  const audioRefA = useRef<HTMLAudioElement | null>(null);
  const audioRefB = useRef<HTMLAudioElement | null>(null);
  const activeAudioRef = useRef<'A' | 'B'>('A');

  // Web Audio API refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeARef = useRef<GainNode | null>(null);
  const gainNodeBRef = useRef<GainNode | null>(null);

  // iOS autoplay warmup: tracks whether Audio B has been authorized via user gesture
  const warmupDoneRef = useRef(false);

  // Store callbacks in ref to avoid effect re-runs
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Volume state (needed for crossfade calculations)
  const [volume, setVolumeState] = useState(initialVolume);

  /**
   * Ensure the AudioContext is running. Must be called from a user gesture
   * on iOS Safari (first play). After that it stays running.
   */
  const ensureAudioContext = useCallback(async () => {
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
        logger.debug('[AudioElements] AudioContext resumed');
      } catch (e) {
        logger.warn('[AudioElements] Failed to resume AudioContext:', (e as Error).message);
      }
    }
  }, []);

  /**
   * Get the gain node for a given audio ID
   */
  const getGainNode = useCallback((audioId: 'A' | 'B'): GainNode | null => {
    return audioId === 'A' ? gainNodeARef.current : gainNodeBRef.current;
  }, []);

  /**
   * Get the gain node for a given HTMLAudioElement
   */
  const getGainForAudio = useCallback((audio: HTMLAudioElement): GainNode | null => {
    if (audio === audioRefA.current) return gainNodeARef.current;
    if (audio === audioRefB.current) return gainNodeBRef.current;
    return null;
  }, []);

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
    // This fixes the issue where duration shows stale value after crossfade
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
   * Set volume on both audio elements via Web Audio GainNodes.
   */
  const setVolume = useCallback((newVolume: number) => {
    const gainA = gainNodeARef.current;
    const gainB = gainNodeBRef.current;
    if (gainA) gainA.gain.value = newVolume;
    if (gainB) gainB.gain.value = newVolume;
    setVolumeState(newVolume);
  }, []);

  /**
   * Set volume on a specific audio element via its GainNode (for crossfade).
   */
  const setAudioVolume = useCallback(
    (audioId: 'A' | 'B', newVolume: number) => {
      const gain = getGainNode(audioId);
      if (gain) gain.gain.value = newVolume;
    },
    [getGainNode]
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
   * Sets the inactive GainNode to 0 to prevent sound until crossfade starts.
   */
  const loadOnInactive = useCallback(
    (src: string) => {
      const audio = getInactiveAudio();
      if (audio) {
        audio.src = src;
        // Silence via GainNode — works on all platforms including iOS
        // where audio.volume is read-only and audio.muted gates the
        // MediaElementSourceNode output.
        const inactiveId = activeAudioRef.current === 'A' ? 'B' : 'A';
        const gain = getGainNode(inactiveId);
        if (gain) gain.gain.value = 0;
        audio.load();
      }
    },
    [getInactiveAudio, getGainNode]
  );

  /**
   * Wait for audio to be ready to play without interruption
   * This prevents crackling when starting playback before buffer is ready
   */
  const waitForAudioReady = useCallback(
    (audio: HTMLAudioElement, timeout: number = 3000): Promise<boolean> => {
      return new Promise((resolve) => {
        // If already ready to play through, resolve immediately
        if (audio.readyState >= 4) {
          // HAVE_ENOUGH_DATA
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

        // Timeout fallback - don't block forever
        const timeoutId = window.setTimeout(() => {
          cleanup();
          // Resolve true anyway - let the browser handle buffering
          resolve(true);
        }, timeout);

        audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
        audio.addEventListener('error', handleError, { once: true });
      });
    },
    []
  );

  /**
   * Warm up the inactive audio element for iOS autoplay authorization.
   * iOS Safari requires each HTMLAudioElement to receive play() from a user gesture
   * before allowing programmatic play(). We load a silent WAV and play/pause it
   * so that crossfade's playInactive() (called from timeupdate, not user gesture) works.
   *
   * MUST be called synchronously from a user gesture handler (before any await)
   * to preserve the user activation context.
   */
  const warmUpInactiveAudio = useCallback(() => {
    const inactive = getInactiveAudio();
    if (!inactive) return;

    // Ensure gain is 0 so warmup produces no audible output
    const inactiveId = activeAudioRef.current === 'A' ? 'B' : 'A';
    const gain = getGainNode(inactiveId);
    if (gain) gain.gain.value = 0;

    // Load a tiny silent WAV if no real source is loaded yet
    if (!inactive.src || inactive.src === '' || inactive.src === window.location.href) {
      inactive.src = SILENT_WAV;
      inactive.load();
    }

    // Fire-and-forget: play → pause to grant autoplay authorization.
    // The play() is synchronous relative to the user gesture, so iOS grants it.
    // Don't clear src after — that revokes the authorization.
    inactive
      .play()
      .then(() => {
        inactive.pause();
        inactive.currentTime = 0;
        logger.debug('[AudioElements] Inactive audio warmed up for iOS autoplay');
      })
      .catch((e) => {
        logger.debug('[AudioElements] Inactive warmup skipped:', (e as Error).message);
      });
  }, [getInactiveAudio, getGainNode]);

  /**
   * Play the active audio element, waiting for buffer if needed.
   * On first call, also warms up the inactive element for iOS autoplay
   * and resumes the AudioContext (both require user gesture).
   */
  const playActive = useCallback(
    async (waitForBuffer: boolean = true) => {
      // Warm up inactive audio BEFORE any await — iOS user gesture context
      // is lost after the first await, so this must happen synchronously.
      if (!warmupDoneRef.current) {
        warmupDoneRef.current = true;
        warmUpInactiveAudio();
      }

      await ensureAudioContext();
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
    [getActiveAudio, waitForAudioReady, ensureAudioContext, warmUpInactiveAudio]
  );

  /**
   * Play the inactive audio element (for crossfade), waiting for buffer if needed.
   * Resumes AudioContext on first call (iOS requires user gesture).
   */
  const playInactive = useCallback(
    async (waitForBuffer: boolean = true) => {
      await ensureAudioContext();
      const audio = getInactiveAudio();
      if (audio) {
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
    [getInactiveAudio, waitForAudioReady, ensureAudioContext]
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
   * Fade out an audio element via its GainNode to prevent clicks/pops.
   * Returns a promise that resolves when fade is complete.
   */
  const fadeOutAudio = useCallback(
    (audio: HTMLAudioElement, duration: number = 50): Promise<void> => {
      return new Promise((resolve) => {
        if (!audio || audio.paused) {
          resolve();
          return;
        }

        const gain = getGainForAudio(audio);
        if (!gain) {
          resolve();
          return;
        }

        const startVolume = gain.gain.value;
        if (startVolume === 0) {
          resolve();
          return;
        }

        const startTime = performance.now();

        const animateFadeOut = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(1, elapsed / duration);

          gain.gain.value = startVolume * (1 - progress);

          if (progress < 1) {
            requestAnimationFrame(animateFadeOut);
          } else {
            gain.gain.value = 0;
            resolve();
          }
        };

        requestAnimationFrame(animateFadeOut);
      });
    },
    [getGainForAudio]
  );

  /**
   * Stop and clear both audio elements with fade-out to prevent pops
   */
  const stopBoth = useCallback(async () => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;

    // Fade out both in parallel to prevent clicks
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
    // stopBoth clears src='', which revokes iOS autoplay authorization.
    // Reset so the next playActive re-warms the inactive element.
    warmupDoneRef.current = false;
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
        // Note: intentionally not clearing audio.src here. On mobile,
        // clearing src revokes the element's autoplay permission, causing
        // future play() calls to fail with NotAllowedError. The src is
        // harmlessly overwritten when the element is next used for
        // loading or crossfade (same approach as finishCrossfade).
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

  // Initialize audio elements, Web Audio API, and event listeners
  useEffect(() => {
    const audioA = new Audio();
    audioRefA.current = audioA;

    const audioB = new Audio();
    audioRefB.current = audioB;

    // Set up Web Audio API for universal volume control.
    // On iOS Safari, HTMLAudioElement.volume is read-only (always 1.0).
    // Web Audio GainNodes bypass this limitation, enabling crossfade on iOS.
    //
    // Routing: Audio element → MediaElementSourceNode → GainNode → destination
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    let audioContext: AudioContext | null = null;

    if (AudioCtx) {
      try {
        audioContext = new AudioCtx();
        audioContextRef.current = audioContext;

        const sourceA = audioContext.createMediaElementSource(audioA);
        const gainA = audioContext.createGain();
        gainA.gain.value = initialVolume;
        sourceA.connect(gainA).connect(audioContext.destination);
        gainNodeARef.current = gainA;

        const sourceB = audioContext.createMediaElementSource(audioB);
        const gainB = audioContext.createGain();
        gainB.gain.value = initialVolume;
        sourceB.connect(gainB).connect(audioContext.destination);
        gainNodeBRef.current = gainB;

        logger.debug(
          '[AudioElements] Web Audio API initialized — crossfade available on all platforms'
        );
      } catch (e) {
        logger.error('[AudioElements] Web Audio API setup failed:', (e as Error).message);
        // Without Web Audio, audio elements still play (direct output) but
        // volume control and crossfade won't work on iOS.
        audioA.volume = initialVolume;
        audioB.volume = initialVolume;
      }
    } else {
      logger.warn('[AudioElements] AudioContext not available, falling back to native volume');
      audioA.volume = initialVolume;
      audioB.volume = initialVolume;
    }

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

    // Build per-element handlers and attach/detach listeners in a loop to
    // eliminate the duplicated addEventListener/removeEventListener blocks.
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
        // Only fire onEnded for the ACTIVE element to prevent double-advancing
        // the queue when the inactive element's old track ends.
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
      gainNodeARef.current = null;
      gainNodeBRef.current = null;
      if (audioContext) {
        audioContext.close();
        audioContextRef.current = null;
      }
    };
  }, [initialVolume]);

  return {
    // Refs (for direct access if needed)
    audioRefA,
    audioRefB,
    activeAudioRef,

    // State
    volume,

    // With Web Audio API, volume control works on all platforms (including iOS).
    // Kept for API compatibility — always true.
    volumeControlSupported: true as const,

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
