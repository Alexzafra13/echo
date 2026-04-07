/**
 * useAudioElement Hook
 *
 * Manages HTML Audio element lifecycle and events.
 * Handles audio playback, time updates, and signal status for radio streams.
 */

import { useRef, useEffect, useCallback } from 'react';

interface AudioState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  radioSignalStatus: 'good' | 'weak' | 'error' | null;
}

interface UseAudioElementParams {
  volume: number;
  isRadioMode: boolean;
  onStateChange: (updates: Partial<AudioState>) => void;
}

export function useAudioElement({
  volume,
  isRadioMode,
  onStateChange
}: UseAudioElementParams) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    // Event listeners
    const handleTimeUpdate = () => {
      onStateChange({ currentTime: audio.currentTime });
    };

    const handleLoadedMetadata = () => {
      onStateChange({ duration: audio.duration });
    };

    const handlePlay = () => {
      onStateChange({ isPlaying: true });
    };

    const handlePause = () => {
      onStateChange({ isPlaying: false });
    };

    // Radio signal status handlers
    const handlePlaying = () => {
      onStateChange({
        isPlaying: true,
        radioSignalStatus: isRadioMode ? 'good' : null
      });
    };

    const handleWaiting = () => {
      if (isRadioMode) {
        onStateChange({ radioSignalStatus: 'weak' });
      }
    };

    const handleStalled = () => {
      if (isRadioMode) {
        onStateChange({ radioSignalStatus: 'weak' });
      }
    };

    const handleError = () => {
      if (isRadioMode) {
        onStateChange({ radioSignalStatus: 'error' });
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [volume, isRadioMode, onStateChange]);

  // Basic playback controls
  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    onStateChange({ isPlaying: false, currentTime: 0 });
  }, [onStateChange]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      onStateChange({ currentTime: time });
    }
  }, [onStateChange]);

  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  return {
    audioRef,
    pause,
    stop,
    seek,
    setVolume,
  };
}
