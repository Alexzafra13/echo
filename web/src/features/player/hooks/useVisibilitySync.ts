import { useEffect, type MutableRefObject, type RefObject } from 'react';
import { logger } from '@shared/utils/logger';

// Pasado este tiempo desde que el sistema pausó la música, no se reanuda sola:
// lo más probable es que el usuario haya pasado a otra cosa.
export const MAX_RESUME_AFTER_INTERRUPTION_MS = 10 * 60 * 1000;

interface UseVisibilitySyncOptions {
  isPlaying: boolean;
  /** Intención del usuario: true desde que pulsa play hasta que pausa o para */
  wantsToPlayRef: MutableRefObject<boolean>;
  /** Momento en que el sistema pausó el audio sin que el usuario lo pidiera */
  interruptedAtRef: RefObject<number | null>;
  getActiveAudio: () => HTMLAudioElement | null;
  setIsPlaying: (playing: boolean) => void;
}

/**
 * Sincroniza el estado del reproductor al volver del segundo plano.
 *
 * En móvil el sistema pausa el audio cuando otra app suena (llamada, nota de
 * voz, otra música) y no siempre lo reanuda. El evento 'pause' ya habrá puesto
 * isPlaying a false, así que la decisión de reanudar se basa en lo que el
 * usuario quería (wantsToPlayRef), no en el estado del elemento.
 */
export function useVisibilitySync({
  isPlaying,
  wantsToPlayRef,
  interruptedAtRef,
  getActiveAudio,
  setIsPlaying,
}: UseVisibilitySyncOptions) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return;

      const activeAudio = getActiveAudio();
      if (!activeAudio) return;

      if (wantsToPlayRef.current && activeAudio.paused && !activeAudio.ended) {
        const interruptedAt = interruptedAtRef.current;
        if (
          interruptedAt !== null &&
          Date.now() - interruptedAt > MAX_RESUME_AFTER_INTERRUPTION_MS
        ) {
          logger.debug('[Player] Interruption too old, not resuming automatically');
          wantsToPlayRef.current = false;
          return;
        }

        logger.debug('[Player] App foregrounded: audio was suspended, attempting resume');
        activeAudio.play().catch(() => {
          logger.warn('[Player] Resume after foreground failed, syncing state');
          setIsPlaying(false);
        });
      } else if (!isPlaying && !activeAudio.paused) {
        setIsPlaying(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [getActiveAudio, isPlaying, wantsToPlayRef, interruptedAtRef, setIsPlaying]);
}
