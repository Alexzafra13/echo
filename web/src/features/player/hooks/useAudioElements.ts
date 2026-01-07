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
 * Hook for managing dual audio elements with crossfade support
 * Provides low-level audio control for both primary (A) and secondary (B) audio elements
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
   */
  const switchActiveAudio = useCallback(() => {
    activeAudioRef.current = activeAudioRef.current === 'A' ? 'B' : 'A';
    logger.debug('[AudioElements] Switched to audio:', activeAudioRef.current);
    return activeAudioRef.current;
  }, []);

  /**
   * Reset to audio A as active
   */
  const resetToAudioA = useCallback(() => {
    activeAudioRef.current = 'A';
  }, []);

  /**
   * Set volume on both audio elements
   */
  const setVolume = useCallback((newVolume: number) => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;
    if (audioA) audioA.volume = newVolume;
    if (audioB) audioB.volume = newVolume;
    setVolumeState(newVolume);
  }, []);

  /**
   * Set volume on a specific audio element (for crossfade)
   */
  const setAudioVolume = useCallback((audioId: 'A' | 'B', newVolume: number) => {
    const audio = audioId === 'A' ? audioRefA.current : audioRefB.current;
    if (audio) audio.volume = newVolume;
  }, []);

  /**
   * Load a source on the active audio element
   */
  const loadOnActive = useCallback((src: string) => {
    const audio = getActiveAudio();
    if (audio) {
      audio.src = src;
      audio.load();
    }
  }, [getActiveAudio]);

  /**
   * Load a source on the inactive audio element (for crossfade preloading)
   */
  const loadOnInactive = useCallback((src: string) => {
    const audio = getInactiveAudio();
    if (audio) {
      audio.src = src;
      audio.volume = 0; // Start at 0 for crossfade
      audio.load();
    }
  }, [getInactiveAudio]);

  /**
   * Wait for audio to be ready to play without interruption
   * This prevents crackling when starting playback before buffer is ready
   */
  const waitForAudioReady = useCallback((audio: HTMLAudioElement, timeout: number = 3000): Promise<boolean> => {
    return new Promise((resolve) => {
      // If already ready to play through, resolve immediately
      if (audio.readyState >= 4) { // HAVE_ENOUGH_DATA
        resolve(true);
        return;
      }

      let timeoutId: number;

      const handleCanPlayThrough = () => {
        clearTimeout(timeoutId);
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('error', handleError);
        resolve(true);
      };

      const handleError = () => {
        clearTimeout(timeoutId);
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('error', handleError);
        resolve(false);
      };

      // Timeout fallback - don't block forever
      timeoutId = window.setTimeout(() => {
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('error', handleError);
        // Resolve true anyway - let the browser handle buffering
        resolve(true);
      }, timeout);

      audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
      audio.addEventListener('error', handleError, { once: true });
    });
  }, []);

  /**
   * Play the active audio element, waiting for buffer if needed
   */
  const playActive = useCallback(async (waitForBuffer: boolean = true) => {
    const audio = getActiveAudio();
    if (audio) {
      try {
        // Wait for enough buffer to prevent crackling on mobile/PWA
        if (waitForBuffer) {
          await waitForAudioReady(audio);
        }
        await audio.play();
      } catch (error) {
        logger.error('[AudioElements] Failed to play:', (error as Error).message);
        throw error;
      }
    }
  }, [getActiveAudio, waitForAudioReady]);

  /**
   * Play the inactive audio element (for crossfade), waiting for buffer if needed
   */
  const playInactive = useCallback(async (waitForBuffer: boolean = true) => {
    const audio = getInactiveAudio();
    if (audio) {
      try {
        // Wait for enough buffer to prevent crackling during crossfade
        if (waitForBuffer) {
          await waitForAudioReady(audio);
        }
        await audio.play();
      } catch (error) {
        logger.error('[AudioElements] Failed to play inactive:', (error as Error).message);
        throw error;
      }
    }
  }, [getInactiveAudio, waitForAudioReady]);

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
   * Fade out an audio element to prevent clicks/pops
   * Returns a promise that resolves when fade is complete
   */
  const fadeOutAudio = useCallback((audio: HTMLAudioElement, duration: number = 50): Promise<void> => {
    return new Promise((resolve) => {
      if (!audio || audio.paused || audio.volume === 0) {
        resolve();
        return;
      }

      const startVolume = audio.volume;
      const startTime = performance.now();

      const animateFadeOut = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);

        // Use exponential curve for quick but smooth fade
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
  }, []);

  /**
   * Stop and clear both audio elements with fade-out to prevent pops
   */
  const stopBoth = useCallback(async () => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;

    // Fade out both in parallel to prevent clicks
    await Promise.all([
      audioA ? fadeOutAudio(audioA) : Promise.resolve(),
      audioB ? fadeOutAudio(audioB) : Promise.resolve(),
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
  const stopActive = useCallback(async (withFade: boolean = false) => {
    const audio = getActiveAudio();
    if (audio) {
      if (withFade && !audio.paused) {
        await fadeOutAudio(audio);
      }
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    }
  }, [getActiveAudio, fadeOutAudio]);

  /**
   * Stop and clear the inactive audio element with optional fade-out
   */
  const stopInactive = useCallback(async (withFade: boolean = false) => {
    const audio = getInactiveAudio();
    if (audio) {
      if (withFade && !audio.paused) {
        await fadeOutAudio(audio);
      }
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    }
  }, [getInactiveAudio, fadeOutAudio]);

  /**
   * Seek to a specific time on the active audio
   */
  const seek = useCallback((time: number) => {
    const audio = getActiveAudio();
    if (audio) {
      audio.currentTime = time;
    }
  }, [getActiveAudio]);

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

    // Create event handlers
    const createTimeUpdateHandler = (audio: HTMLAudioElement, audioId: 'A' | 'B') => () => {
      if (activeAudioRef.current === audioId) {
        callbacksRef.current?.onTimeUpdate?.(audio.currentTime);
      }
    };

    const createLoadedMetadataHandler = (audio: HTMLAudioElement, audioId: 'A' | 'B') => () => {
      if (activeAudioRef.current === audioId) {
        callbacksRef.current?.onDurationChange?.(audio.duration);
      }
    };

    const handlePlay = () => {
      callbacksRef.current?.onPlay?.();
    };

    const handlePause = () => {
      // Only trigger pause callback if both audios are paused (for crossfade support)
      if (audioA.paused && audioB.paused) {
        callbacksRef.current?.onPause?.();
      }
    };

    const handleEnded = () => {
      callbacksRef.current?.onEnded?.();
    };

    const handleError = (e: Event) => {
      callbacksRef.current?.onError?.(e);
    };

    const handleWaiting = () => {
      callbacksRef.current?.onWaiting?.();
    };

    const handlePlaying = () => {
      callbacksRef.current?.onPlaying?.();
    };

    const handleStalled = () => {
      callbacksRef.current?.onStalled?.();
    };

    const handleTimeUpdateA = createTimeUpdateHandler(audioA, 'A');
    const handleTimeUpdateB = createTimeUpdateHandler(audioB, 'B');
    const handleLoadedMetadataA = createLoadedMetadataHandler(audioA, 'A');
    const handleLoadedMetadataB = createLoadedMetadataHandler(audioB, 'B');

    // Add listeners to audio A
    audioA.addEventListener('timeupdate', handleTimeUpdateA);
    audioA.addEventListener('loadedmetadata', handleLoadedMetadataA);
    audioA.addEventListener('play', handlePlay);
    audioA.addEventListener('pause', handlePause);
    audioA.addEventListener('ended', handleEnded);
    audioA.addEventListener('error', handleError);
    audioA.addEventListener('waiting', handleWaiting);
    audioA.addEventListener('playing', handlePlaying);
    audioA.addEventListener('stalled', handleStalled);

    // Add listeners to audio B
    audioB.addEventListener('timeupdate', handleTimeUpdateB);
    audioB.addEventListener('loadedmetadata', handleLoadedMetadataB);
    audioB.addEventListener('play', handlePlay);
    audioB.addEventListener('pause', handlePause);
    audioB.addEventListener('ended', handleEnded);
    audioB.addEventListener('error', handleError);
    audioB.addEventListener('waiting', handleWaiting);
    audioB.addEventListener('playing', handlePlaying);
    audioB.addEventListener('stalled', handleStalled);

    return () => {
      // Cleanup audio A
      audioA.removeEventListener('timeupdate', handleTimeUpdateA);
      audioA.removeEventListener('loadedmetadata', handleLoadedMetadataA);
      audioA.removeEventListener('play', handlePlay);
      audioA.removeEventListener('pause', handlePause);
      audioA.removeEventListener('ended', handleEnded);
      audioA.removeEventListener('error', handleError);
      audioA.removeEventListener('waiting', handleWaiting);
      audioA.removeEventListener('playing', handlePlaying);
      audioA.removeEventListener('stalled', handleStalled);
      audioA.pause();

      // Cleanup audio B
      audioB.removeEventListener('timeupdate', handleTimeUpdateB);
      audioB.removeEventListener('loadedmetadata', handleLoadedMetadataB);
      audioB.removeEventListener('play', handlePlay);
      audioB.removeEventListener('pause', handlePause);
      audioB.removeEventListener('ended', handleEnded);
      audioB.removeEventListener('error', handleError);
      audioB.removeEventListener('waiting', handleWaiting);
      audioB.removeEventListener('playing', handlePlaying);
      audioB.removeEventListener('stalled', handleStalled);
      audioB.pause();
    };
  }, [initialVolume]);

  return {
    // Refs (for direct access if needed)
    audioRefA,
    audioRefB,
    activeAudioRef,

    // State
    volume,

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
