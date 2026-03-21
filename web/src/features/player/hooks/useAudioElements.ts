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

// En iOS Safari, audio.volume es de solo lectura (siempre 1.0)
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
 * Gestión de dos elementos de audio (A y B) para crossfade.
 * Usa HTMLAudioElement.volume directo (sin Web Audio API) para que
 * la reproducción en segundo plano funcione en iOS.
 * En iOS el volumen es hardware — el crossfade es solo solapamiento.
 */
export function useAudioElements(options: UseAudioElementsOptions = {}) {
  const { initialVolume = 0.7, callbacks } = options;

  const audioRefA = useRef<HTMLAudioElement | null>(null);
  const audioRefB = useRef<HTMLAudioElement | null>(null);
  const activeAudioRef = useRef<'A' | 'B'>('A');

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const [volume, setVolumeState] = useState(initialVolume);
  const [volumeControlSupported] = useState(() => detectVolumeControl());

  const getActiveAudio = useCallback((): HTMLAudioElement | null => {
    return activeAudioRef.current === 'A' ? audioRefA.current : audioRefB.current;
  }, []);

  const getInactiveAudio = useCallback((): HTMLAudioElement | null => {
    return activeAudioRef.current === 'A' ? audioRefB.current : audioRefA.current;
  }, []);

  const getActiveAudioId = useCallback((): 'A' | 'B' => {
    return activeAudioRef.current;
  }, []);

  const switchActiveAudio = useCallback(() => {
    activeAudioRef.current = activeAudioRef.current === 'A' ? 'B' : 'A';
    const newId = activeAudioRef.current;
    logger.debug('[AudioElements] Switched to audio:', newId);

    // Actualizar duración y tiempo del nuevo audio activo
    const newActiveAudio = newId === 'A' ? audioRefA.current : audioRefB.current;
    if (newActiveAudio) {
      if (!isNaN(newActiveAudio.duration) && newActiveAudio.duration > 0) {
        callbacksRef.current?.onDurationChange?.(newActiveAudio.duration);
      }
      callbacksRef.current?.onTimeUpdate?.(newActiveAudio.currentTime);
    }

    return newId;
  }, []);

  const resetToAudioA = useCallback(() => {
    activeAudioRef.current = 'A';
  }, []);

  // En iOS es no-op (volumen controlado por hardware)
  const setVolume = useCallback((newVolume: number) => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;
    if (audioA) audioA.volume = newVolume;
    if (audioB) audioB.volume = newVolume;
    setVolumeState(newVolume);
  }, []);

  const setAudioVolume = useCallback(
    (audioId: 'A' | 'B', newVolume: number) => {
      const audio = audioId === 'A' ? audioRefA.current : audioRefB.current;
      if (audio) audio.volume = newVolume;
    },
    []
  );

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

  // Precarga en el inactivo con volumen 0 (en iOS, se mutea porque volume es read-only)
  const loadOnInactive = useCallback(
    (src: string) => {
      const audio = getInactiveAudio();
      if (audio) {
        audio.src = src;
        audio.volume = 0;
        if (!volumeControlSupported) {
          audio.muted = true;
        }
        audio.load();
      }
    },
    [getInactiveAudio, volumeControlSupported]
  );

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

        const handleCanPlayThrough = () => { cleanup(); resolve(true); };
        const handleError = () => { cleanup(); resolve(false); };

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

  const playActive = useCallback(
    async (waitForBuffer: boolean = true) => {
      const audio = getActiveAudio();
      if (audio) {
        try {
          if (waitForBuffer) await waitForAudioReady(audio);
          await audio.play();
        } catch (error) {
          logger.error('[AudioElements] Failed to play:', (error as Error).message);
          throw error;
        }
      }
    },
    [getActiveAudio, waitForAudioReady]
  );

  const playInactive = useCallback(
    async (waitForBuffer: boolean = true) => {
      const audio = getInactiveAudio();
      if (audio) {
        audio.muted = false; // Quitar mute de la precarga (iOS)
        try {
          if (waitForBuffer) await waitForAudioReady(audio);
          await audio.play();
        } catch (error) {
          logger.error('[AudioElements] Failed to play inactive:', (error as Error).message);
          throw error;
        }
      }
    },
    [getInactiveAudio, waitForAudioReady]
  );

  const pauseActive = useCallback(() => {
    getActiveAudio()?.pause();
  }, [getActiveAudio]);

  const pauseBoth = useCallback(() => {
    audioRefA.current?.pause();
    audioRefB.current?.pause();
  }, []);

  // Rampa de volumen a 0 para evitar clics. En iOS resuelve directo (corte seco).
  const fadeOutAudio = useCallback(
    (audio: HTMLAudioElement, duration: number = 50): Promise<void> => {
      return new Promise((resolve) => {
        if (!audio || audio.paused) { resolve(); return; }

        const startVolume = audio.volume;
        if (startVolume === 0) { resolve(); return; }

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

  const stopBoth = useCallback(async () => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;

    await Promise.all([
      audioA ? fadeOutAudio(audioA, 50) : Promise.resolve(),
      audioB ? fadeOutAudio(audioB, 50) : Promise.resolve(),
    ]);

    if (audioA) { audioA.pause(); audioA.currentTime = 0; audioA.src = ''; }
    if (audioB) { audioB.pause(); audioB.currentTime = 0; audioB.src = ''; }
    activeAudioRef.current = 'A';
  }, [fadeOutAudio]);

  const stopActive = useCallback(
    async (withFade: boolean = false) => {
      const audio = getActiveAudio();
      if (audio) {
        if (withFade && !audio.paused) await fadeOutAudio(audio, 50);
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
      }
    },
    [getActiveAudio, fadeOutAudio]
  );

  const stopInactive = useCallback(
    async (withFade: boolean = false) => {
      const audio = getInactiveAudio();
      if (audio) {
        if (withFade && !audio.paused) await fadeOutAudio(audio, 50);
        audio.pause();
        audio.currentTime = 0;
      }
    },
    [getInactiveAudio, fadeOutAudio]
  );

  const seek = useCallback(
    (time: number) => {
      const audio = getActiveAudio();
      if (audio) audio.currentTime = time;
    },
    [getActiveAudio]
  );

  const getCurrentTime = useCallback((): number => {
    return getActiveAudio()?.currentTime || 0;
  }, [getActiveAudio]);

  const getDuration = useCallback((): number => {
    return getActiveAudio()?.duration || 0;
  }, [getActiveAudio]);

  const areBothPaused = useCallback((): boolean => {
    return (audioRefA.current?.paused ?? true) && (audioRefB.current?.paused ?? true);
  }, []);

  useEffect(() => {
    const audioA = new Audio();
    audioA.volume = initialVolume;
    audioRefA.current = audioA;

    const audioB = new Audio();
    audioB.volume = initialVolume;
    audioRefB.current = audioB;

    logger.debug('[AudioElements] Inicializado (salida directa, sin Web Audio API)');

    const handlePlay = () => callbacksRef.current?.onPlay?.();
    const handleError = (e: Event) => callbacksRef.current?.onError?.(e);
    const handleWaiting = () => callbacksRef.current?.onWaiting?.();
    const handlePlaying = () => callbacksRef.current?.onPlaying?.();
    const handleStalled = () => callbacksRef.current?.onStalled?.();

    // Solo dispara onPause si ambos están pausados (durante crossfade uno sigue sonando).
    // Si el audio activo terminó naturalmente, ignorar — HTML5 dispara 'pause' antes de 'ended'
    // y sin este guard, isPlaying parpadea a false y el SO revoca el foco de audio.
    const handlePause = () => {
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

    // Solo dispara eventos del elemento activo (evita duplicados durante crossfade)
    const perElementHandlers = elements.map(({ audio, id }) => {
      const handlers: Array<[string, EventListener]> = [
        ['timeupdate', () => { if (activeAudioRef.current === id) callbacksRef.current?.onTimeUpdate?.(audio.currentTime); }],
        ['loadedmetadata', () => { if (activeAudioRef.current === id) callbacksRef.current?.onDurationChange?.(audio.duration); }],
        ['ended', () => { if (activeAudioRef.current === id) callbacksRef.current?.onEnded?.(); }],
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
    audioRefA,
    audioRefB,
    activeAudioRef,
    volume,
    volumeControlSupported,
    getActiveAudio,
    getInactiveAudio,
    getActiveAudioId,
    getCurrentTime,
    getDuration,
    areBothPaused,
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
    waitForAudioReady,
    fadeOutAudio,
  };
}

export type AudioElements = ReturnType<typeof useAudioElements>;
