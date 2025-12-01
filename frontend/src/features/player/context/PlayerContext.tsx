import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Track, PlayerState, PlayerContextValue, RadioStation } from '../types';
import { useStreamToken } from '../hooks/useStreamToken';
import { useCrossfadeSettings } from '../hooks/useCrossfadeSettings';
import { recordPlay, recordSkip, type PlayContext } from '@shared/services/play-tracking.service';
import { useRadioMetadata } from '@features/radio/hooks/useRadioMetadata';
import { logger } from '@shared/utils/logger';
import type { RadioBrowserStation } from '@shared/types/radio.types';

/**
 * Gets the proper stream URL, using nginx proxy for HTTP streams when on HTTPS
 * This fixes the Mixed Content issue where browsers block HTTP content on HTTPS pages
 */
function getProxiedStreamUrl(streamUrl: string): string {
  const isHttpsPage = window.location.protocol === 'https:';
  const isHttpStream = streamUrl.startsWith('http://');

  if (isHttpsPage && isHttpStream) {
    // Use nginx proxy to avoid Mixed Content blocking
    const proxyUrl = `/api/radio/stream/proxy?url=${encodeURIComponent(streamUrl)}`;
    logger.debug('[Player] Using proxy for HTTP stream:', streamUrl);
    return proxyUrl;
  }

  return streamUrl;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

interface PlayerProviderProps {
  children: ReactNode;
}

/**
 * Play session tracking data
 */
interface PlaySession {
  trackId: string;
  startTime: number; // Unix timestamp
  playContext: PlayContext;
  sourceId?: string;
  sourceType?: import('@shared/services/play-tracking.service').SourceType;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  // Primary and secondary audio elements for crossfade
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioRefB = useRef<HTMLAudioElement | null>(null);
  const activeAudioRef = useRef<'A' | 'B'>('A');
  const crossfadeIntervalRef = useRef<number | null>(null);
  const crossfadeTimeoutRef = useRef<number | null>(null);

  const playSessionRef = useRef<PlaySession | null>(null);
  const { data: streamTokenData } = useStreamToken();
  const { settings: crossfadeSettings, setEnabled: setCrossfadeEnabledStorage, setDuration: setCrossfadeDurationStorage } = useCrossfadeSettings();

  const [state, setState] = useState<PlayerState>(() => ({
    currentTrack: null,
    queue: [],
    isPlaying: false,
    volume: 0.7,
    currentTime: 0,
    duration: 0,
    isShuffle: false,
    repeatMode: 'off',
    crossfade: crossfadeSettings,
    isCrossfading: false,
    currentRadioStation: null,
    isRadioMode: false,
    radioMetadata: null,
    radioSignalStatus: null,
  }));

  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);

  // ICY Metadata streaming for radio stations
  const { metadata: radioMetadata } = useRadioMetadata({
    stationUuid: state.currentRadioStation?.stationUuid || null,
    streamUrl: state.currentRadioStation?.url || null,
    isPlaying: state.isPlaying && state.isRadioMode,
  });

  // Sync radioMetadata to state when it changes (including null)
  useEffect(() => {
    setState(prev => ({ ...prev, radioMetadata }));
  }, [radioMetadata]);

  // Sync crossfade settings from localStorage when they change
  useEffect(() => {
    setState(prev => ({ ...prev, crossfade: crossfadeSettings }));
  }, [crossfadeSettings]);

  // ========== NIVEL 0: Sin dependencias de funciones ==========

  /**
   * Determine play context based on player state
   */
  const getPlayContext = useCallback((): PlayContext => {
    if (state.isShuffle) {
      return 'shuffle';
    }
    // Default to 'direct' - can be enhanced with sourceType tracking
    return 'direct';
  }, [state.isShuffle]);

  /**
   * Start tracking a new play session
   */
  const startPlaySession = useCallback((track: Track, context?: PlayContext) => {
    const playContext = context || getPlayContext();

    playSessionRef.current = {
      trackId: track.id,
      startTime: Date.now(),
      playContext,
      // These can be set externally when playing from specific sources
      sourceId: undefined,
      sourceType: undefined,
    };

    logger.debug('[PlayTracking] Started session:', playSessionRef.current);
  }, [getPlayContext]);

  /**
   * End current play session and record to backend
   */
  const endPlaySession = useCallback(async (skipped: boolean = false) => {
    const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
    if (!playSessionRef.current || !activeAudio) return;

    const session = playSessionRef.current;
    const audio = activeAudio;
    const duration = audio.duration || 0;
    const currentTime = audio.currentTime || 0;

    // Calculate completion rate
    const completionRate = duration > 0 ? currentTime / duration : 0;

    logger.debug('[PlayTracking] Ending session:', {
      trackId: session.trackId,
      completionRate: (completionRate * 100).toFixed(1) + '%',
      skipped,
    });

    if (skipped) {
      // Record skip event
      await recordSkip({
        trackId: session.trackId,
        timeListened: currentTime,
        totalDuration: duration,
        playContext: session.playContext,
        sourceId: session.sourceId,
        sourceType: session.sourceType,
      });
    } else {
      // Record play event (only if completion > 30% or track ended naturally)
      if (completionRate >= 0.3 || completionRate >= 0.95) {
        await recordPlay({
          trackId: session.trackId,
          playContext: session.playContext,
          completionRate,
          sourceId: session.sourceId,
          sourceType: session.sourceType,
        });
      }
    }

    // Clear session
    playSessionRef.current = null;
  }, []); // No dependencies - only uses refs

  // Pause
  const pause = useCallback(() => {
    const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
    activeAudio?.pause();
  }, []); // No dependencies - only uses refs

  // Stop
  const stop = useCallback(() => {
    const audioA = audioRef.current;
    const audioB = audioRefB.current;
    if (!audioA || !audioB) return;

    // Stop both audios and clear crossfade
    audioA.pause();
    audioA.currentTime = 0;
    audioA.src = '';
    audioB.pause();
    audioB.currentTime = 0;
    audioB.src = '';

    // Reset to audio A
    activeAudioRef.current = 'A';

    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0, isCrossfading: false }));
  }, []); // No dependencies - uses refs and setState with prev

  // Seek to time
  const seek = useCallback((time: number) => {
    const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
    if (activeAudio) {
      activeAudio.currentTime = time;
      setState(prev => ({ ...prev, currentTime: time }));
    }
  }, []); // No dependencies - uses refs and setState with prev

  // Set volume
  const setVolume = useCallback((volume: number) => {
    const audioA = audioRef.current;
    const audioB = audioRefB.current;
    if (audioA && audioB) {
      // Set volume on both audios (the inactive one will be adjusted during crossfade)
      audioA.volume = volume;
      audioB.volume = volume;
      setState(prev => ({ ...prev, volume }));
    }
  }, []); // No dependencies - uses refs and setState with prev

  // Toggle shuffle
  const toggleShuffle = useCallback(() => {
    setState(prev => ({ ...prev, isShuffle: !prev.isShuffle }));
  }, []); // No dependencies - uses setState with prev

  // Toggle repeat
  const toggleRepeat = useCallback(() => {
    setState(prev => {
      const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
      const currentIndex = modes.indexOf(prev.repeatMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      return { ...prev, repeatMode: nextMode };
    });
  }, []); // No dependencies - uses setState with prev

  // Set crossfade enabled
  const setCrossfadeEnabled = useCallback((enabled: boolean) => {
    setCrossfadeEnabledStorage(enabled);
  }, [setCrossfadeEnabledStorage]);

  // Set crossfade duration
  const setCrossfadeDuration = useCallback((duration: number) => {
    setCrossfadeDurationStorage(duration);
  }, [setCrossfadeDurationStorage]);

  // Get the currently active audio element
  const getActiveAudio = useCallback(() => {
    return activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
  }, []);

  // Get the inactive (next) audio element
  const getInactiveAudio = useCallback(() => {
    return activeAudioRef.current === 'A' ? audioRefB.current : audioRef.current;
  }, []);

  // Clear any ongoing crossfade
  const clearCrossfade = useCallback(() => {
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
    if (crossfadeTimeoutRef.current) {
      clearTimeout(crossfadeTimeoutRef.current);
      crossfadeTimeoutRef.current = null;
    }
    setState(prev => ({ ...prev, isCrossfading: false }));
  }, []);

  // Add tracks to queue
  const addToQueue = useCallback((track: Track | Track[]) => {
    const tracks = Array.isArray(track) ? track : [track];
    setState(prev => ({
      ...prev,
      queue: [...prev.queue, ...tracks],
    }));
  }, []); // No dependencies - uses setState with prev

  // Clear queue
  const clearQueue = useCallback(() => {
    setState(prev => ({ ...prev, queue: [] }));
    setCurrentQueueIndex(-1);
  }, []); // No dependencies - uses setState with prev

  // Play radio station
  const playRadio = useCallback((station: RadioStation | RadioBrowserStation) => {
    const audioA = audioRef.current;
    const audioB = audioRefB.current;
    if (!audioA || !audioB) return;

    // Use url_resolved if available (better quality), fallback to url
    const streamUrl = 'urlResolved' in station ? station.urlResolved : 'url_resolved' in station ? station.url_resolved : station.url;

    if (!streamUrl) {
      logger.error('[Player] Radio station has no valid stream URL');
      return;
    }

    // Stop any playing audio and reset to audio A for radio
    audioA.pause();
    audioA.src = '';
    audioB.pause();
    audioB.src = '';
    activeAudioRef.current = 'A';

    const audio = audioA;

    // Clear previous event listeners to avoid duplicates
    audio.oncanplay = null;
    audio.onerror = null;

    // Use proxy for HTTP streams when on HTTPS (Mixed Content fix)
    const finalStreamUrl = getProxiedStreamUrl(streamUrl);
    audio.src = finalStreamUrl;
    audio.load();

    // Wait for audio to be ready before playing
    audio.oncanplay = () => {
      audio.play().catch((error) => {
        logger.error('[Player] Failed to play radio:', error.message);
      });
      audio.oncanplay = null; // Clean up after playing
    };

    // Error handler for radio loading issues
    audio.onerror = () => {
      logger.error('[Player] Failed to load radio station:', station.name, 'URL:', finalStreamUrl);
      audio.onerror = null;
    };

    setState(prev => ({
      ...prev,
      currentRadioStation: station,
      isRadioMode: true,
      isPlaying: true,
      radioSignalStatus: 'good', // Initialize signal status (will update based on events)
      isCrossfading: false, // Disable crossfade for radio
      // Clear track state when playing radio
      currentTrack: null,
      queue: [],
      currentTime: 0,
      duration: 0,
    }));

    setCurrentQueueIndex(-1);
  }, []); // No dependencies - uses refs and setState with prev

  // Stop radio
  const stopRadio = useCallback(() => {
    const audioA = audioRef.current;
    const audioB = audioRefB.current;
    if (!audioA || !audioB) return;

    audioA.pause();
    audioA.currentTime = 0;
    audioA.src = '';
    audioB.pause();
    audioB.currentTime = 0;
    audioB.src = '';

    activeAudioRef.current = 'A';

    setState(prev => ({
      ...prev,
      currentRadioStation: null,
      isRadioMode: false,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    }));
  }, []); // No dependencies - uses refs and setState with prev

  // ========== NIVEL 1: Depende solo de nivel 0 ==========

  // Play a track (with optional crossfade support)
  const play = useCallback((track?: Track, withCrossfade: boolean = false) => {
    const activeAudio = getActiveAudio();
    const inactiveAudio = getInactiveAudio();

    if (!activeAudio || !inactiveAudio) return;

    if (track) {
      // Play new track
      if (!streamTokenData?.token) {
        logger.error('[Player] Stream token not available');
        return;
      }

      // Use VITE_API_URL with fallback to /api (same as apiClient)
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      const streamUrl = `${API_BASE_URL}/tracks/${track.id}/stream?token=${streamTokenData.token}`;

      if (withCrossfade && state.crossfade.enabled && state.isPlaying) {
        // Crossfade: load next track on inactive audio and fade
        logger.debug('[Player] Starting crossfade to:', track.title);

        // Prepare next track on inactive audio
        inactiveAudio.src = streamUrl;
        inactiveAudio.volume = 0;
        inactiveAudio.load();

        // Error handler for audio loading issues
        inactiveAudio.onerror = () => {
          logger.error('[Player] Failed to load audio track:', track.title);
          clearCrossfade();
        };

        setState(prev => ({ ...prev, isCrossfading: true }));

        // Start playing the next track and perform crossfade
        inactiveAudio.play().then(() => {
          const fadeDuration = state.crossfade.duration * 1000; // Convert to ms
          const fadeSteps = 50; // Number of volume steps
          const fadeInterval = fadeDuration / fadeSteps;
          const volumeStep = state.volume / fadeSteps;

          let currentStep = 0;

          crossfadeIntervalRef.current = window.setInterval(() => {
            currentStep++;

            // Fade out active, fade in inactive
            const fadeOutVolume = Math.max(0, state.volume - (volumeStep * currentStep));
            const fadeInVolume = Math.min(state.volume, volumeStep * currentStep);

            activeAudio.volume = fadeOutVolume;
            inactiveAudio.volume = fadeInVolume;

            if (currentStep >= fadeSteps) {
              // Crossfade complete
              clearCrossfade();

              // Stop the old audio
              activeAudio.pause();
              activeAudio.currentTime = 0;
              activeAudio.src = '';

              // Switch active audio
              activeAudioRef.current = activeAudioRef.current === 'A' ? 'B' : 'A';

              logger.debug('[Player] Crossfade complete, now using audio:', activeAudioRef.current);
            }
          }, fadeInterval);
        }).catch((error) => {
          logger.error('[Player] Failed to play audio for crossfade:', error.message);
          clearCrossfade();
        });

        setState(prev => ({
          ...prev,
          currentTrack: track,
          isPlaying: true,
          currentRadioStation: null,
          isRadioMode: false,
          radioSignalStatus: null,
        }));

        // Start new play session for tracking
        startPlaySession(track);
      } else {
        // Normal play (no crossfade)
        clearCrossfade();

        // Stop the other audio if playing
        inactiveAudio.pause();
        inactiveAudio.currentTime = 0;
        inactiveAudio.src = '';

        activeAudio.src = streamUrl;
        activeAudio.volume = state.volume;
        activeAudio.load();

        // Error handler for audio loading issues
        activeAudio.onerror = () => {
          logger.error('[Player] Failed to load audio track:', track.title);
        };

        activeAudio.play().catch((error) => {
          logger.error('[Player] Failed to play audio:', error.message);
        });

        setState(prev => ({
          ...prev,
          currentTrack: track,
          isPlaying: true,
          currentRadioStation: null,
          isRadioMode: false,
          radioSignalStatus: null,
        }));

        // Start new play session for tracking
        startPlaySession(track);
      }
    } else if (state.currentTrack && !state.isRadioMode) {
      // Resume current track (only if not in radio mode)
      activeAudio.play();
    } else if (state.isRadioMode && state.currentRadioStation) {
      // Resume radio station
      activeAudio.play();
    }
  }, [streamTokenData?.token, state.currentTrack, state.isRadioMode, state.currentRadioStation, state.crossfade, state.isPlaying, state.volume, startPlaySession, getActiveAudio, getInactiveAudio, clearCrossfade]);

  // ========== NIVEL 2: Depende de nivel 0 y 1 ==========

  // Play next track in queue (with optional crossfade)
  const playNext = useCallback((useCrossfade: boolean = false) => {
    if (state.queue.length === 0) return;

    // End current session as skipped ONLY if there's an active session
    // (if handleEnded already called endPlaySession, this will be null)
    if (playSessionRef.current) {
      endPlaySession(true);
    }

    let nextIndex: number;
    if (state.isShuffle) {
      nextIndex = Math.floor(Math.random() * state.queue.length);
    } else {
      nextIndex = currentQueueIndex + 1;
      if (nextIndex >= state.queue.length) {
        if (state.repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return;
        }
      }
    }

    setCurrentQueueIndex(nextIndex);
    play(state.queue[nextIndex], useCrossfade);
  }, [state.queue, state.isShuffle, state.repeatMode, currentQueueIndex, endPlaySession, play]);

  // Play previous track in queue
  const playPrevious = useCallback(() => {
    if (state.queue.length === 0) return;

    // If more than 3 seconds played, restart current track
    const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
    if (activeAudio && activeAudio.currentTime > 3) {
      activeAudio.currentTime = 0;
      return;
    }

    // End current session as skipped ONLY if there's an active session
    if (playSessionRef.current) {
      endPlaySession(true);
    }

    let prevIndex = currentQueueIndex - 1;
    if (prevIndex < 0) {
      if (state.repeatMode === 'all') {
        prevIndex = state.queue.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    setCurrentQueueIndex(prevIndex);
    play(state.queue[prevIndex]);
  }, [state.queue, state.repeatMode, currentQueueIndex, endPlaySession, play]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, pause, play]);

  // Play queue of tracks
  const playQueue = useCallback((tracks: Track[], startIndex: number = 0) => {
    setState(prev => ({ ...prev, queue: tracks }));
    setCurrentQueueIndex(startIndex);
    play(tracks[startIndex]);
  }, [play]);

  // Handle track ended - needs to be updated when dependencies change
  // Also handles crossfade timing detection
  useEffect(() => {
    const audioA = audioRef.current;
    const audioB = audioRefB.current;
    if (!audioA || !audioB) return;

    const handleEnded = () => {
      // Only handle ended if not in crossfade mode (crossfade handles its own transition)
      if (state.isCrossfading) return;

      // Record completed play (not skipped)
      endPlaySession(false);

      if (state.repeatMode === 'one') {
        const activeAudio = activeAudioRef.current === 'A' ? audioA : audioB;
        activeAudio.play();
      } else if (state.repeatMode === 'all' || currentQueueIndex < state.queue.length - 1) {
        playNext(false); // No crossfade since track already ended
      } else {
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    };

    audioA.addEventListener('ended', handleEnded);
    audioB.addEventListener('ended', handleEnded);
    return () => {
      audioA.removeEventListener('ended', handleEnded);
      audioB.removeEventListener('ended', handleEnded);
    };
  }, [state.repeatMode, state.isCrossfading, currentQueueIndex, state.queue.length, endPlaySession, playNext]);

  // Crossfade timing detection - start crossfade before track ends
  const crossfadeStartedRef = useRef(false);

  useEffect(() => {
    const audioA = audioRef.current;
    const audioB = audioRefB.current;
    if (!audioA || !audioB) return;

    const checkCrossfadeTiming = () => {
      // Skip if crossfade is disabled, already crossfading, in radio mode, or repeat one
      if (!state.crossfade.enabled || state.isCrossfading || state.isRadioMode || state.repeatMode === 'one') {
        crossfadeStartedRef.current = false;
        return;
      }

      // Check if there's a next track to play
      const hasNextTrack = state.repeatMode === 'all' || currentQueueIndex < state.queue.length - 1;
      if (!hasNextTrack) {
        crossfadeStartedRef.current = false;
        return;
      }

      const activeAudio = activeAudioRef.current === 'A' ? audioA : audioB;
      const timeRemaining = activeAudio.duration - activeAudio.currentTime;
      const crossfadeDuration = state.crossfade.duration;

      // Start crossfade when time remaining equals crossfade duration
      // Only if we haven't already started it for this track
      if (timeRemaining <= crossfadeDuration && timeRemaining > 0 && !crossfadeStartedRef.current && activeAudio.duration > crossfadeDuration) {
        crossfadeStartedRef.current = true;
        logger.debug('[Player] Time to start crossfade, remaining:', timeRemaining);

        // End current play session before crossfade
        endPlaySession(false);

        // Trigger crossfade to next track
        playNext(true);
      }
    };

    // Reset crossfade started flag when track changes
    crossfadeStartedRef.current = false;

    audioA.addEventListener('timeupdate', checkCrossfadeTiming);
    audioB.addEventListener('timeupdate', checkCrossfadeTiming);
    return () => {
      audioA.removeEventListener('timeupdate', checkCrossfadeTiming);
      audioB.removeEventListener('timeupdate', checkCrossfadeTiming);
    };
  }, [state.crossfade.enabled, state.crossfade.duration, state.isCrossfading, state.isRadioMode, state.repeatMode, currentQueueIndex, state.queue.length, endPlaySession, playNext]);

  // ========== NIVEL 3: Depende de nivel 2 ==========

  // Remove track from queue
  const removeFromQueue = useCallback((index: number) => {
    setState(prev => {
      const newQueue = [...prev.queue];
      newQueue.splice(index, 1);
      return { ...prev, queue: newQueue };
    });

    if (index < currentQueueIndex) {
      setCurrentQueueIndex(currentQueueIndex - 1);
    } else if (index === currentQueueIndex) {
      // If removed current track, play next
      playNext();
    }
  }, [currentQueueIndex, playNext]);

  // ========== EFFECTS ==========

  // Initialize both audio elements for crossfade support
  useEffect(() => {
    // Create primary audio element (A)
    const audioA = new Audio();
    audioA.volume = state.volume;
    audioRef.current = audioA;

    // Create secondary audio element (B) for crossfade
    const audioB = new Audio();
    audioB.volume = state.volume;
    audioRefB.current = audioB;

    // Event listeners - only track time/duration from active audio
    const createTimeUpdateHandler = (audio: HTMLAudioElement, audioId: 'A' | 'B') => () => {
      // Only update time from the currently active audio
      if (activeAudioRef.current === audioId) {
        setState(prev => ({ ...prev, currentTime: audio.currentTime }));
      }
    };

    const createLoadedMetadataHandler = (audio: HTMLAudioElement, audioId: 'A' | 'B') => () => {
      // Only update duration from the currently active audio
      if (activeAudioRef.current === audioId) {
        setState(prev => ({ ...prev, duration: audio.duration }));
      }
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      // Only set isPlaying false if both audios are paused (to handle crossfade)
      if (audioA.paused && audioB.paused) {
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    };

    // Radio signal status handlers
    const handlePlaying = () => {
      setState(prev => ({
        ...prev,
        isPlaying: true,
        // Only update signal status if in radio mode
        radioSignalStatus: prev.isRadioMode ? 'good' : prev.radioSignalStatus
      }));
    };

    const handleWaiting = () => {
      setState(prev => ({
        ...prev,
        // Only update signal status if in radio mode
        radioSignalStatus: prev.isRadioMode ? 'weak' : prev.radioSignalStatus
      }));
    };

    const handleStalled = () => {
      setState(prev => ({
        ...prev,
        // Only update signal status if in radio mode
        radioSignalStatus: prev.isRadioMode ? 'weak' : prev.radioSignalStatus
      }));
    };

    const handleError = () => {
      setState(prev => ({
        ...prev,
        // Only update signal status if in radio mode
        radioSignalStatus: prev.isRadioMode ? 'error' : prev.radioSignalStatus
      }));
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
    audioA.addEventListener('playing', handlePlaying);
    audioA.addEventListener('waiting', handleWaiting);
    audioA.addEventListener('stalled', handleStalled);
    audioA.addEventListener('error', handleError);

    // Add listeners to audio B
    audioB.addEventListener('timeupdate', handleTimeUpdateB);
    audioB.addEventListener('loadedmetadata', handleLoadedMetadataB);
    audioB.addEventListener('play', handlePlay);
    audioB.addEventListener('pause', handlePause);
    audioB.addEventListener('playing', handlePlaying);
    audioB.addEventListener('waiting', handleWaiting);
    audioB.addEventListener('stalled', handleStalled);
    audioB.addEventListener('error', handleError);

    return () => {
      // Cleanup audio A
      audioA.removeEventListener('timeupdate', handleTimeUpdateA);
      audioA.removeEventListener('loadedmetadata', handleLoadedMetadataA);
      audioA.removeEventListener('play', handlePlay);
      audioA.removeEventListener('pause', handlePause);
      audioA.removeEventListener('playing', handlePlaying);
      audioA.removeEventListener('waiting', handleWaiting);
      audioA.removeEventListener('stalled', handleStalled);
      audioA.removeEventListener('error', handleError);
      audioA.pause();

      // Cleanup audio B
      audioB.removeEventListener('timeupdate', handleTimeUpdateB);
      audioB.removeEventListener('loadedmetadata', handleLoadedMetadataB);
      audioB.removeEventListener('play', handlePlay);
      audioB.removeEventListener('pause', handlePause);
      audioB.removeEventListener('playing', handlePlaying);
      audioB.removeEventListener('waiting', handleWaiting);
      audioB.removeEventListener('stalled', handleStalled);
      audioB.removeEventListener('error', handleError);
      audioB.pause();

      // Clear crossfade timers
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
      }
      if (crossfadeTimeoutRef.current) {
        clearTimeout(crossfadeTimeoutRef.current);
      }
    };
  }, []);

  const value: PlayerContextValue = useMemo(
    () => ({
      ...state,
      play,
      pause,
      togglePlayPause,
      stop,
      playNext,
      playPrevious,
      addToQueue,
      removeFromQueue,
      clearQueue,
      playQueue,
      playRadio,
      stopRadio,
      seek,
      setVolume,
      toggleShuffle,
      toggleRepeat,
      setCrossfadeEnabled,
      setCrossfadeDuration,
    }),
    [
      state,
      play,
      pause,
      togglePlayPause,
      stop,
      playNext,
      playPrevious,
      addToQueue,
      removeFromQueue,
      clearQueue,
      playQueue,
      playRadio,
      stopRadio,
      seek,
      setVolume,
      toggleShuffle,
      toggleRepeat,
      setCrossfadeEnabled,
      setCrossfadeDuration,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
