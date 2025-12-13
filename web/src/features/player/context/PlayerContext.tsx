/**
 * PlayerContext
 *
 * Central orchestrator for all player functionality.
 * Uses specialized hooks for different concerns:
 * - useAudioElements: Dual audio element management
 * - useQueueManagement: Queue and playback order
 * - usePlayTracking: Play session analytics
 * - useCrossfadeLogic: Crossfade transitions
 * - useRadioPlayback: Radio station streaming
 */

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, ReactNode } from 'react';
import { Track, PlayerContextValue, RadioStation } from '../types';
import { useStreamToken } from '../hooks/useStreamToken';
import { useCrossfadeSettings } from '../hooks/useCrossfadeSettings';
import { useNormalizationSettings } from '../hooks/useNormalizationSettings';
import { useAudioElements } from '../hooks/useAudioElements';
import { useAudioNormalization } from '../hooks/useAudioNormalization';
import { usePlayTracking } from '../hooks/usePlayTracking';
import { useQueueManagement } from '../hooks/useQueueManagement';
import { useCrossfadeLogic } from '../hooks/useCrossfadeLogic';
import { useRadioPlayback } from '../hooks/useRadioPlayback';
import { useRadioMetadata } from '@features/radio/hooks/useRadioMetadata';
import { logger } from '@shared/utils/logger';
import { updatePlaybackState } from '@shared/services/play-tracking.service';
import { useAuthStore } from '@shared/store';
import type { RadioBrowserStation } from '@shared/types/radio.types';

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  // ========== EXTERNAL HOOKS ==========
  const { data: streamTokenData } = useStreamToken();
  const {
    settings: crossfadeSettings,
    setEnabled: setCrossfadeEnabledStorage,
    setDuration: setCrossfadeDurationStorage,
  } = useCrossfadeSettings();
  const {
    settings: normalizationSettings,
    setEnabled: setNormalizationEnabledStorage,
    setTargetLufs: setNormalizationTargetLufsStorage,
    setPreventClipping: setNormalizationPreventClippingStorage,
  } = useNormalizationSettings();

  // ========== STATE ==========
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [userVolume, setUserVolumeState] = useState(0.7); // Volumen del usuario (para el slider)

  // Ref for playNext callback to avoid circular dependencies
  const playNextRef = useRef<(useCrossfade: boolean) => void>(() => {});

  // ========== AUDIO ELEMENTS ==========
  const audioElements = useAudioElements({
    initialVolume: 0.7,
    callbacks: {
      onPlay: () => setIsPlaying(true),
      onPause: () => setIsPlaying(false),
      onTimeUpdate: (time) => setCurrentTime(time),
      onDurationChange: (dur) => setDuration(dur),
    },
  });

  // ========== AUDIO NORMALIZATION ==========
  const normalization = useAudioNormalization(normalizationSettings);

  // Register audio elements with normalization hook (for volume-based normalization)
  // Note: userVolume is accessed via ref to avoid re-running effect on volume changes
  const userVolumeRef = useRef(userVolume);
  userVolumeRef.current = userVolume;

  useEffect(() => {
    const audioA = audioElements.audioRefA.current;
    const audioB = audioElements.audioRefB.current;
    if (audioA && audioB) {
      normalization.registerAudioElements(audioA, audioB);
      // Sync initial volume with normalization hook
      normalization.setUserVolume(userVolumeRef.current);
    }
  }, [audioElements.audioRefA, audioElements.audioRefB, normalization]);

  // ========== QUEUE MANAGEMENT ==========
  const queue = useQueueManagement();

  // ========== PLAY TRACKING ==========
  const playTracking = usePlayTracking({
    audioElements,
    isShuffle: queue.isShuffle,
  });

  // ========== RADIO PLAYBACK ==========
  const radio = useRadioPlayback({
    audioElements,
  });

  // ========== CROSSFADE LOGIC ==========
  const crossfade = useCrossfadeLogic({
    audioElements,
    settings: crossfadeSettings,
    isRadioMode: radio.isRadioMode,
    repeatMode: queue.repeatMode,
    hasNextTrack: queue.repeatMode === 'all' || queue.currentIndex < queue.queue.length - 1,
    onCrossfadeTrigger: () => {
      // End current play session before crossfade
      playTracking.endPlaySession(false);
      // Trigger next track with crossfade
      playNextRef.current(true);
    },
  });

  // ========== RADIO METADATA ==========
  const { metadata: radioMetadata } = useRadioMetadata({
    stationUuid: radio.currentStation?.stationUuid || null,
    streamUrl: radio.currentStation?.url || null,
    isPlaying: isPlaying && radio.isRadioMode,
  });

  // Sync radio metadata to radio state
  // Note: Only depend on radioMetadata, not the entire radio object (which is recreated each render)
  useEffect(() => {
    radio.setMetadata(radioMetadata);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radioMetadata]);

  // Update radio signal status based on audio events
  useEffect(() => {
    const audioA = audioElements.audioRefA.current;
    const audioB = audioElements.audioRefB.current;
    if (!audioA || !audioB) return;

    const handlePlaying = () => {
      if (radio.isRadioMode) radio.setSignalStatus('good');
    };
    const handleWaiting = () => {
      if (radio.isRadioMode) radio.setSignalStatus('weak');
    };
    const handleStalled = () => {
      if (radio.isRadioMode) radio.setSignalStatus('weak');
    };
    const handleError = () => {
      if (radio.isRadioMode) radio.setSignalStatus('error');
    };

    audioA.addEventListener('playing', handlePlaying);
    audioA.addEventListener('waiting', handleWaiting);
    audioA.addEventListener('stalled', handleStalled);
    audioA.addEventListener('error', handleError);
    audioB.addEventListener('playing', handlePlaying);
    audioB.addEventListener('waiting', handleWaiting);
    audioB.addEventListener('stalled', handleStalled);
    audioB.addEventListener('error', handleError);

    return () => {
      audioA.removeEventListener('playing', handlePlaying);
      audioA.removeEventListener('waiting', handleWaiting);
      audioA.removeEventListener('stalled', handleStalled);
      audioA.removeEventListener('error', handleError);
      audioB.removeEventListener('playing', handlePlaying);
      audioB.removeEventListener('waiting', handleWaiting);
      audioB.removeEventListener('stalled', handleStalled);
      audioB.removeEventListener('error', handleError);
    };
    // Note: Only depend on audioElements refs, not the entire radio object
    // radio.isRadioMode and radio.setSignalStatus are accessed inside handlers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioElements.audioRefA, audioElements.audioRefB]);

  // ========== TRACK PLAYBACK ==========

  /**
   * Build stream URL for a track
   */
  const getStreamUrl = useCallback((track: Track): string | null => {
    if (!streamTokenData?.token) {
      logger.error('[Player] Stream token not available');
      return null;
    }
    const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
    return `${API_BASE_URL}/tracks/${track.id}/stream?token=${streamTokenData.token}`;
  }, [streamTokenData?.token]);

  /**
   * Play a track with optional crossfade
   */
  const playTrack = useCallback(async (track: Track, withCrossfade: boolean = false) => {
    const streamUrl = getStreamUrl(track);
    if (!streamUrl) {
      logger.error('[Player] Cannot play track - stream URL not available (token missing?)');
      setIsPlaying(false);
      return;
    }

    // Exit radio mode if active
    if (radio.isRadioMode) {
      radio.stopRadio();
    }

    // Apply audio normalization for the new track (adjusts volume directly)
    normalization.applyGain(track);

    if (withCrossfade && crossfadeSettings.enabled && isPlaying) {
      // Crossfade: prepare next track on inactive audio
      logger.debug('[Player] Starting crossfade to:', track.title);
      crossfade.prepareCrossfade(streamUrl);

      // Update track state
      setCurrentTrack(track);

      // Start crossfade transition
      crossfade.performCrossfade();

      // Start new play session
      playTracking.startPlaySession(track);
    } else {
      // Normal play (no crossfade)
      crossfade.clearCrossfade();
      audioElements.stopInactive();
      audioElements.loadOnActive(streamUrl);

      try {
        await audioElements.playActive();
        setCurrentTrack(track);
        playTracking.startPlaySession(track);
      } catch (error) {
        logger.error('[Player] Failed to play:', (error as Error).message);
        setIsPlaying(false);
        setCurrentTrack(null);
        return;
      }
    }

    crossfade.resetCrossfadeFlag();
  }, [getStreamUrl, radio, crossfadeSettings.enabled, isPlaying, crossfade, audioElements, playTracking, normalization]);

  /**
   * Play - either a new track or resume current playback
   */
  const play = useCallback((track?: Track, withCrossfade: boolean = false) => {
    if (track) {
      playTrack(track, withCrossfade);
    } else if (currentTrack && !radio.isRadioMode) {
      // Resume current track
      audioElements.playActive().catch((error) => {
        logger.error('[Player] Failed to resume playback:', error.message);
        setIsPlaying(false);
      });
    } else if (radio.isRadioMode && radio.currentStation) {
      // Resume radio
      radio.resumeRadio().catch((error) => {
        logger.error('[Player] Failed to resume radio:', error.message);
        setIsPlaying(false);
      });
    }
  }, [playTrack, currentTrack, radio, audioElements]);

  /**
   * Pause playback
   */
  const pause = useCallback(() => {
    audioElements.pauseActive();
  }, [audioElements]);

  /**
   * Stop playback
   */
  const stop = useCallback(() => {
    audioElements.stopBoth();
    setIsPlaying(false);
    setCurrentTime(0);
  }, [audioElements]);

  /**
   * Seek to time
   */
  const seek = useCallback((time: number) => {
    audioElements.seek(time);
    setCurrentTime(time);
  }, [audioElements]);

  /**
   * Set volume (applies normalization gain automatically)
   */
  const setVolume = useCallback((volume: number) => {
    // Update user volume state (for slider UI)
    setUserVolumeState(volume);
    // Update normalization hook's user volume (it will apply effective volume to audio elements)
    normalization.setUserVolume(volume);
  }, [normalization]);

  /**
   * Toggle play/pause
   */
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  // ========== QUEUE OPERATIONS ==========

  /**
   * Handle playing next track
   */
  const handlePlayNext = useCallback((useCrossfade: boolean = false) => {
    if (queue.queue.length === 0) return;

    // End current session as skipped if there's an active session
    if (playTracking.hasActiveSession()) {
      playTracking.endPlaySession(true);
    }

    const nextIndex = queue.getNextIndex();
    if (nextIndex === -1) return;

    queue.setCurrentIndex(nextIndex);
    const nextTrack = queue.getTrackAt(nextIndex);
    if (nextTrack) {
      playTrack(nextTrack, useCrossfade);
    }
  }, [queue, playTracking, playTrack]);

  // Update ref for crossfade callback
  useEffect(() => {
    playNextRef.current = handlePlayNext;
  }, [handlePlayNext]);

  /**
   * Play next track in queue
   */
  const playNext = useCallback(() => {
    handlePlayNext(false);
  }, [handlePlayNext]);

  /**
   * Play previous track in queue
   */
  const playPrevious = useCallback(() => {
    if (queue.queue.length === 0) return;

    // If more than 3 seconds played, restart current track
    if (audioElements.getCurrentTime() > 3) {
      audioElements.seek(0);
      return;
    }

    // End current session as skipped
    if (playTracking.hasActiveSession()) {
      playTracking.endPlaySession(true);
    }

    const prevIndex = queue.getPreviousIndex();
    queue.setCurrentIndex(prevIndex);
    const prevTrack = queue.getTrackAt(prevIndex);
    if (prevTrack) {
      playTrack(prevTrack, false);
    }
  }, [queue, audioElements, playTracking, playTrack]);

  /**
   * Play a queue of tracks starting at index
   * Does NOT auto-shuffle - caller is responsible for shuffle state and track order
   */
  const playQueue = useCallback((tracks: Track[], startIndex: number = 0) => {
    queue.setQueue(tracks, startIndex);
    if (tracks[startIndex]) {
      playTrack(tracks[startIndex], false);
    }
  }, [queue, playTrack]);

  /**
   * Remove track from queue
   */
  const removeFromQueue = useCallback((index: number) => {
    const wasCurrentTrack = index === queue.currentIndex;
    queue.removeFromQueue(index);

    if (wasCurrentTrack && queue.queue.length > 0) {
      // Play next track if we removed the current one
      const nextTrack = queue.getTrackAt(queue.currentIndex);
      if (nextTrack) {
        playTrack(nextTrack, false);
      }
    }
  }, [queue, playTrack]);

  // ========== TRACK ENDED HANDLER ==========
  useEffect(() => {
    const audioA = audioElements.audioRefA.current;
    const audioB = audioElements.audioRefB.current;
    if (!audioA || !audioB) return;

    const handleEnded = () => {
      // Only handle ended if not in crossfade mode
      if (crossfade.isCrossfading) return;

      // Record completed play (not skipped)
      playTracking.endPlaySession(false);

      if (queue.repeatMode === 'one') {
        audioElements.playActive().catch((error) => {
          logger.error('[Player] Failed to repeat track:', error.message);
          setIsPlaying(false);
        });
      } else if (queue.hasNext()) {
        handlePlayNext(false);
      } else {
        setIsPlaying(false);
      }
    };

    audioA.addEventListener('ended', handleEnded);
    audioB.addEventListener('ended', handleEnded);
    return () => {
      audioA.removeEventListener('ended', handleEnded);
      audioB.removeEventListener('ended', handleEnded);
    };
  }, [audioElements, crossfade.isCrossfading, playTracking, queue, handlePlayNext]);

  // ========== MEDIA SESSION API (for mobile background playback) ==========
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Update metadata when track changes
    if (currentTrack) {
      const artwork = currentTrack.coverImage || currentTrack.albumId
        ? [{ src: currentTrack.coverImage || `/api/albums/${currentTrack.albumId}/cover`, sizes: '512x512', type: 'image/jpeg' }]
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

  // Set up Media Session action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const actionHandlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => { play(); }],
      ['pause', () => { pause(); }],
      ['previoustrack', () => { playPrevious(); }],
      ['nexttrack', () => { playNext(); }],
      ['seekto', (details) => { if (details.seekTime !== undefined) seek(details.seekTime); }],
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

  // Update playback state for Media Session
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // ========== SOCIAL "LISTENING NOW" SYNC ==========
  // Update playback state in backend for friends to see
  useEffect(() => {
    // Only sync for track playback (not radio)
    if (radio.isRadioMode) return;

    // Check if user is authenticated before syncing
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) return;

    // Send playback state to backend (fire and forget, errors are handled silently)
    updatePlaybackState({
      isPlaying,
      currentTrackId: isPlaying && currentTrack ? currentTrack.id : null,
    });
  }, [isPlaying, currentTrack?.id, radio.isRadioMode]);

  // ========== RADIO OPERATIONS ==========

  /**
   * Play a radio station
   */
  const playRadio = useCallback((station: RadioStation | RadioBrowserStation) => {
    // Clear track state
    setCurrentTrack(null);
    queue.clearQueue();
    crossfade.clearCrossfade();

    radio.playRadio(station);
  }, [radio, queue, crossfade]);

  /**
   * Stop radio
   */
  const stopRadio = useCallback(() => {
    radio.stopRadio();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [radio]);

  // ========== CROSSFADE SETTINGS ==========

  const setCrossfadeEnabled = useCallback((enabled: boolean) => {
    setCrossfadeEnabledStorage(enabled);
  }, [setCrossfadeEnabledStorage]);

  const setCrossfadeDuration = useCallback((dur: number) => {
    setCrossfadeDurationStorage(dur);
  }, [setCrossfadeDurationStorage]);

  // ========== NORMALIZATION SETTINGS ==========

  const setNormalizationEnabled = useCallback((enabled: boolean) => {
    setNormalizationEnabledStorage(enabled);
    // Re-apply gain with new settings
    normalization.applyGain(currentTrack);
  }, [setNormalizationEnabledStorage, normalization, currentTrack]);

  const setNormalizationTargetLufs = useCallback((target: -14 | -16) => {
    setNormalizationTargetLufsStorage(target);
    // Re-apply gain with new settings
    normalization.applyGain(currentTrack);
  }, [setNormalizationTargetLufsStorage, normalization, currentTrack]);

  const setNormalizationPreventClipping = useCallback((prevent: boolean) => {
    setNormalizationPreventClippingStorage(prevent);
    // Re-apply gain with new settings
    normalization.applyGain(currentTrack);
  }, [setNormalizationPreventClippingStorage, normalization, currentTrack]);

  // ========== CONTEXT VALUE ==========

  const value: PlayerContextValue = useMemo(
    () => ({
      // Track state
      currentTrack,
      queue: queue.queue,
      isPlaying,
      volume: userVolume,
      currentTime,
      duration,
      isShuffle: queue.isShuffle,
      repeatMode: queue.repeatMode,

      // Crossfade state
      crossfade: crossfadeSettings,
      isCrossfading: crossfade.isCrossfading,

      // Normalization state
      normalization: normalizationSettings,

      // Radio state
      currentRadioStation: radio.currentStation,
      isRadioMode: radio.isRadioMode,
      radioMetadata: radio.metadata,
      radioSignalStatus: radio.signalStatus,

      // Playback controls
      play,
      pause,
      togglePlayPause,
      stop,
      playNext,
      playPrevious,

      // Queue controls
      addToQueue: queue.addToQueue,
      removeFromQueue,
      clearQueue: queue.clearQueue,
      playQueue,

      // Radio controls
      playRadio,
      stopRadio,

      // Player controls
      seek,
      setVolume,
      toggleShuffle: queue.toggleShuffle,
      setShuffle: queue.setShuffle,
      toggleRepeat: queue.toggleRepeat,

      // Crossfade controls
      setCrossfadeEnabled,
      setCrossfadeDuration,

      // Normalization controls
      setNormalizationEnabled,
      setNormalizationTargetLufs,
      setNormalizationPreventClipping,
    }),
    [
      currentTrack,
      queue.queue,
      queue.isShuffle,
      queue.repeatMode,
      queue.addToQueue,
      queue.clearQueue,
      queue.toggleShuffle,
      queue.toggleRepeat,
      isPlaying,
      userVolume,
      currentTime,
      duration,
      crossfadeSettings,
      crossfade.isCrossfading,
      normalizationSettings,
      radio.currentStation,
      radio.isRadioMode,
      radio.metadata,
      radio.signalStatus,
      play,
      pause,
      togglePlayPause,
      stop,
      playNext,
      playPrevious,
      removeFromQueue,
      playQueue,
      playRadio,
      stopRadio,
      seek,
      setVolume,
      setCrossfadeEnabled,
      setCrossfadeDuration,
      setNormalizationEnabled,
      setNormalizationTargetLufs,
      setNormalizationPreventClipping,
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
