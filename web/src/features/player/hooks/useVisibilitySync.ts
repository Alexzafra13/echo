import { useEffect, useRef } from 'react';
import { logger } from '@shared/utils/logger';

interface UseVisibilitySyncOptions {
  isPlaying: boolean;
  getActiveAudio: () => HTMLAudioElement | null;
  setIsPlaying: (playing: boolean) => void;
  /** Called when the app returns to foreground (e.g., to resume AudioContext on iOS). */
  onForeground?: () => void;
}

/**
 * Syncs player state with actual audio state when the PWA returns to foreground.
 * On mobile, the OS may suspend audio playback in the background. When the app
 * becomes visible again, this hook detects mismatches and attempts to resume.
 */
export function useVisibilitySync({
  isPlaying,
  getActiveAudio,
  setIsPlaying,
  onForeground,
}: UseVisibilitySyncOptions) {
  // Store in ref to avoid re-running the effect when the callback changes
  const onForegroundRef = useRef(onForeground);
  onForegroundRef.current = onForeground;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return;

      // Resume AudioContext first (iOS may have suspended it in background).
      // This must happen before play() so audio routes through Web Audio.
      onForegroundRef.current?.();

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
