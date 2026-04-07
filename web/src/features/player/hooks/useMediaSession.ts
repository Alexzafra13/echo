import { useEffect, useRef } from 'react';
import type { Track, RadioStation } from '../types';
import {
  getCurrentTime as timeStoreGetCurrentTime,
  getDuration as timeStoreGetDuration,
} from '../store/timeStore';

interface RadioState {
  isRadioMode: boolean;
  currentStation: RadioStation | null;
  metadata: { title?: string; artist?: string } | null;
}

interface UseMediaSessionProps {
  currentTrack: Track | null;
  radio: RadioState;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  playPrevious: () => void;
  playNext: () => void;
  seek: (time: number) => void;
}

const SKIP_TIME = 10; // seconds for seekbackward/seekforward

/**
 * Hook to integrate with the Media Session API for system-level media controls.
 * Enables lock screen controls on mobile devices and media key support on desktop.
 *
 * Includes position state updates so the OS can properly maintain audio focus
 * during background playback in PWA mode.
 */
export function useMediaSession({
  currentTrack,
  radio,
  isPlaying,
  play,
  pause,
  stop,
  playPrevious,
  playNext,
  seek,
}: UseMediaSessionProps): void {
  // Lectura síncrona de duration para los useEffect. NO usar useCurrentTime()
  // aquí porque este hook vive dentro de PlayerProvider y re-renderizaría
  // todo el árbol en cada timeupdate (~4/s).
  // Se usa un ref que se actualiza en cada render del provider (que solo ocurre
  // cuando cambia isPlaying, currentTrack, etc. — no en cada timeupdate).
  const durationRef = useRef(timeStoreGetDuration());
  durationRef.current = timeStoreGetDuration();

  // Update metadata when track changes
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentTrack) {
      const coverSrc = currentTrack.coverImage || `/api/albums/${currentTrack.albumId}/cover`;
      const artwork =
        currentTrack.coverImage || currentTrack.albumId
          ? [
              { src: coverSrc, sizes: '192x192', type: 'image/jpeg' },
              { src: coverSrc, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.albumName || '',
        artwork,
      });
    } else if (radio.isRadioMode && radio.currentStation) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: radio.metadata?.title || radio.currentStation.name,
        artist: radio.metadata?.artist || 'Radio',
        album: radio.currentStation.name,
        artwork: radio.currentStation.favicon
          ? [{ src: radio.currentStation.favicon, sizes: '512x512', type: 'image/png' }]
          : [],
      });
    } else if (!currentTrack && !radio.isRadioMode) {
      // Clear metadata when nothing is playing — removes stale notification
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
  }, [currentTrack, radio.isRadioMode, radio.currentStation, radio.metadata]);

  // Set up action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Helper to update position state after seeks (uses refs for fresh values)
    const syncPositionState = (position: number) => {
      const dur = timeStoreGetDuration();
      if (!dur || dur <= 0 || isNaN(dur)) return;
      try {
        navigator.mediaSession.setPositionState({
          duration: dur,
          playbackRate: 1,
          position: Math.min(Math.max(0, position), dur),
        });
      } catch {
        // setPositionState can throw if values are out of range
      }
    };

    const actionHandlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => play()],
      ['pause', () => pause()],
      ['stop', () => stop()],
      ['previoustrack', () => playPrevious()],
      ['nexttrack', () => playNext()],
      [
        'seekto',
        (details) => {
          if (details.seekTime !== undefined) {
            seek(details.seekTime);
            syncPositionState(details.seekTime);
          }
        },
      ],
      [
        'seekbackward',
        (details) => {
          const skipTime = details.seekOffset || SKIP_TIME;
          const newTime = Math.max(0, timeStoreGetCurrentTime() - skipTime);
          seek(newTime);
          syncPositionState(newTime);
        },
      ],
      [
        'seekforward',
        (details) => {
          const skipTime = details.seekOffset || SKIP_TIME;
          const dur = timeStoreGetDuration();
          const newTime = Math.min(dur || Infinity, timeStoreGetCurrentTime() + skipTime);
          seek(newTime);
          syncPositionState(newTime);
        },
      ],
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some actions may not be supported (e.g. stop on some browsers)
      }
    }

    return () => {
      for (const [action] of actionHandlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [play, pause, stop, playPrevious, playNext, seek]);

  // Actualiza el estado de reproducción del SO en transiciones (play/pause, cambio de track).
  // El SO extrapola la posición desde playbackRate, así que solo reportamos en transiciones.
  // Crítico para PWAs en móvil: sin position state el SO revoca el foco de audio.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    const dur = durationRef.current;
    if (dur > 0 && !isNaN(dur) && !radio.isRadioMode) {
      try {
        const pos = timeStoreGetCurrentTime();
        navigator.mediaSession.setPositionState({
          duration: dur,
          playbackRate: 1,
          position: Math.min(Math.max(0, pos), dur),
        });
      } catch {
        // setPositionState puede lanzar si los valores están fuera de rango
      }
    }
    // currentTrack como dep asegura que se actualice cuando cambia la canción
    // (que es cuando duration cambia)
  }, [isPlaying, currentTrack, radio.isRadioMode]);
}
