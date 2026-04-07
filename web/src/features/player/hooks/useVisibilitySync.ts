import { useEffect } from 'react';
import { logger } from '@shared/utils/logger';

interface UseVisibilitySyncOptions {
  isPlaying: boolean;
  getActiveAudio: () => HTMLAudioElement | null;
  setIsPlaying: (playing: boolean) => void;
}

/**
 * Sincroniza el estado del reproductor al volver del segundo plano.
 * En móvil el SO puede suspender el audio — al volver, detecta
 * desajustes e intenta reanudar.
 */
export function useVisibilitySync({
  isPlaying,
  getActiveAudio,
  setIsPlaying,
}: UseVisibilitySyncOptions) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return;

      const activeAudio = getActiveAudio();
      if (!activeAudio) return;

      if (isPlaying && activeAudio.paused && !activeAudio.ended) {
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
  }, [getActiveAudio, isPlaying, setIsPlaying]);
}
