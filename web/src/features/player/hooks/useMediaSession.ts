import { useEffect } from 'react';
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
  play: () => void;
  pause: () => void;
  playPrevious: () => void;
  playNext: () => void;
  seek: (time: number) => void;
}

/**
 * Hook to integrate with the Media Session API for system-level media controls.
 * Enables lock screen controls on mobile devices and media key support on desktop.
 */
export function useMediaSession({
  currentTrack,
  radio,
  isPlaying,
  play,
  pause,
  playPrevious,
  playNext,
  seek,
}: UseMediaSessionProps): void {
  // Update metadata when track changes
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentTrack) {
      const artwork =
        currentTrack.coverImage || currentTrack.albumId
          ? [
              {
                src: currentTrack.coverImage || `/api/albums/${currentTrack.albumId}/cover`,
                sizes: '512x512',
                type: 'image/jpeg',
              },
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
    }
  }, [currentTrack, radio.isRadioMode, radio.currentStation, radio.metadata]);

  // Set up action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const actionHandlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => play()],
      ['pause', () => pause()],
      ['previoustrack', () => playPrevious()],
      ['nexttrack', () => playNext()],
      ['seekto', (details) => details.seekTime !== undefined && seek(details.seekTime)],
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some actions may not be supported
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
  }, [play, pause, playPrevious, playNext, seek]);

  // Update playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);
}
