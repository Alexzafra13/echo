import { useEffect, useRef } from 'react';
import type { Track, RadioStation } from '../types';

interface RadioState {
  isRadioMode: boolean;
  currentStation: RadioStation | null;
  metadata: { title?: string; artist?: string } | null;
}

interface UseMediaSessionProps {
  currentTrack: Track | null;
  radio: RadioState;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
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
  currentTime,
  duration,
  play,
  pause,
  stop,
  playPrevious,
  playNext,
  seek,
}: UseMediaSessionProps): void {
  // Store currentTime/duration in refs so action handlers can read fresh values
  // without needing to re-register on every timeupdate.
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const durationRef = useRef(duration);
  durationRef.current = duration;

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
      const dur = durationRef.current;
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
          const newTime = Math.max(0, currentTimeRef.current - skipTime);
          seek(newTime);
          syncPositionState(newTime);
        },
      ],
      [
        'seekforward',
        (details) => {
          const skipTime = details.seekOffset || SKIP_TIME;
          const dur = durationRef.current;
          const newTime = Math.min(dur || Infinity, currentTimeRef.current + skipTime);
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

  // Update playback state and position on play/pause and track changes.
  // The OS extrapolates the playback position from playbackRate, so we only
  // need to report it on state transitions — not on every timeupdate.
  // This is critical for mobile PWAs: without position state, the OS can't
  // properly maintain audio focus and may suspend background playback.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    if (duration > 0 && !isNaN(duration) && !radio.isRadioMode) {
      try {
        const pos = currentTimeRef.current;
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1,
          position: Math.min(Math.max(0, pos), duration),
        });
      } catch {
        // setPositionState can throw if values are out of range
      }
    }
  }, [isPlaying, duration, radio.isRadioMode]);
}
