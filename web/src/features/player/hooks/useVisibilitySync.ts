import { useEffect, type RefObject } from 'react';
import { logger } from '@shared/utils/logger';

interface UseVisibilitySyncOptions {
  isPlaying: boolean;
  /** Intención del usuario: true desde que pulsa play hasta que pausa o para */
  wantsToPlayRef: RefObject<boolean>;
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
  getActiveAudio,
  setIsPlaying,
}: UseVisibilitySyncOptions) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return;

      const activeAudio = getActiveAudio();
      if (!activeAudio) return;

      if (wantsToPlayRef.current && activeAudio.paused && !activeAudio.ended) {
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
  }, [getActiveAudio, isPlaying, wantsToPlayRef, setIsPlaying]);
}
