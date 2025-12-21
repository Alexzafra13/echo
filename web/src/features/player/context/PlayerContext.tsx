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
import { useAutoplaySettings } from '../hooks/useAutoplaySettings';
import { useAutoplay } from '../hooks/useAutoplay';
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
  const { data: streamTokenData, ensureToken } = useStreamToken();
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
  const {
    settings: autoplaySettings,
    setEnabled: setAutoplayEnabledStorage,
  } = useAutoplaySettings();
  const autoplay = useAutoplay();

  // ========== STATE ==========
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [userVolume, setUserVolumeState] = useState(0.7); // Volumen del usuario (para el slider)
  const [isAutoplayActive, setIsAutoplayActive] = useState(false); // Indica si estamos reproduciendo desde autoplay
  const [autoplaySourceArtist, setAutoplaySourceArtist] = useState<string | null>(null); // Artista fuente del autoplay

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
   * Uses custom streamUrl if available (for federated/remote tracks)
   * Now async to wait for token if not yet available
   */
  const getStreamUrl = useCallback(async (track: Track): Promise<string | null> => {
    // If track has a custom stream URL (e.g., federated track), use it directly
    if (track.streamUrl) {
      return track.streamUrl;
    }

    // Try to get token from cache first
    let token: string | null = streamTokenData?.token ?? null;

    // If no token in cache, wait for it to load
    if (!token) {
      logger.debug('[Player] Token not in cache, waiting for it...');
      token = await ensureToken();
    }

    if (!token) {
      logger.error('[Player] Stream token not available after waiting');
      return null;
    }
    const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
    return `${API_BASE_URL}/tracks/${track.id}/stream?token=${token}`;
  }, [streamTokenData?.token, ensureToken]);

  /**
   * Play a track with optional crossfade
   */
  const playTrack = useCallback(async (track: Track, withCrossfade: boolean = false) => {
    const streamUrl = await getStreamUrl(track);
    if (!streamUrl) {
      logger.warn('[Player] Cannot play track: stream URL unavailable');
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

      audioElements.playActive().catch((error) => {
        logger.error('[Player] Failed to play:', error.message);
      });

      setCurrentTrack(track);
      playTracking.startPlaySession(track);
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
      audioElements.playActive();
    } else if (radio.isRadioMode && radio.currentStation) {
      // Resume radio
      radio.resumeRadio();
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
   * Trigger autoplay with similar artists
   * @returns true if autoplay was triggered, false otherwise
   */
  const triggerAutoplay = useCallback(async (useCrossfade: boolean = false): Promise<boolean> => {
    const canAutoplay = autoplaySettings.enabled && currentTrack?.artistId && !radio.isRadioMode;

    if (!canAutoplay || !currentTrack?.artistId) {
      logger.debug('[Player] Cannot autoplay - conditions not met');
      setIsPlaying(false);
      setIsAutoplayActive(false);
      setAutoplaySourceArtist(null);
      return false;
    }

    logger.warn('[Player] Triggering autoplay for artist:', currentTrack.artistId);

    const currentQueueIds = new Set(queue.queue.map(t => t.id));
    const result = await autoplay.loadSimilarArtistTracks(
      currentTrack.artistId,
      currentQueueIds
    );

    if (result.tracks.length > 0) {
      logger.warn(`[Player] Autoplay: loaded ${result.tracks.length} tracks from similar artists`);
      setIsAutoplayActive(true);
      setAutoplaySourceArtist(result.sourceArtistName);

      // Calculate next index BEFORE adding to queue
      const nextIndex = queue.queue.length;
      // Add tracks to queue and play
      queue.addToQueue(result.tracks);
      queue.setCurrentIndex(nextIndex);
      playTrack(result.tracks[0], useCrossfade);
      return true;
    } else {
      logger.debug('[Player] Autoplay: no similar tracks found');
      setIsPlaying(false);
      setIsAutoplayActive(false);
      setAutoplaySourceArtist(null);
      return false;
    }
  }, [autoplaySettings.enabled, currentTrack, radio.isRadioMode, queue, autoplay, playTrack]);

  /**
   * Handle playing next track
   */
  const handlePlayNext = useCallback(async (useCrossfade: boolean = false) => {
    if (queue.queue.length === 0) return;

    // End current session as skipped if there's an active session
    if (playTracking.hasActiveSession()) {
      playTracking.endPlaySession(true);
    }

    const nextIndex = queue.getNextIndex();

    // No next track - try autoplay
    if (nextIndex === -1) {
      logger.warn('[Player] No next track, attempting autoplay via next button');
      await triggerAutoplay(useCrossfade);
      return;
    }

    queue.setCurrentIndex(nextIndex);
    const nextTrack = queue.getTrackAt(nextIndex);
    if (nextTrack) {
      playTrack(nextTrack, useCrossfade);
    }
  }, [queue, playTracking, playTrack, triggerAutoplay]);

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
    // Reset autoplay state when user starts new playback
    setIsAutoplayActive(false);
    setAutoplaySourceArtist(null);
    autoplay.resetSession();

    queue.setQueue(tracks, startIndex);
    if (tracks[startIndex]) {
      playTrack(tracks[startIndex], false);
    }
  }, [queue, playTrack, autoplay]);

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

    const handleEnded = async () => {
      // Only handle ended if not in crossfade mode
      if (crossfade.isCrossfading) return;

      // Record completed play (not skipped)
      playTracking.endPlaySession(false);

      const hasNextTrack = queue.hasNext();

      // Using warn level so it shows in production for debugging
      logger.warn('[Player] Track ended - checking next action', {
        repeatMode: queue.repeatMode,
        hasNext: hasNextTrack,
        currentIndex: queue.currentIndex,
        queueLength: queue.queue.length,
        autoplayEnabled: autoplaySettings.enabled,
        artistId: currentTrack?.artistId || 'MISSING',
        artistName: currentTrack?.artist || 'MISSING',
        isRadioMode: radio.isRadioMode,
      });

      if (queue.repeatMode === 'one') {
        logger.warn('[Player] Repeat one - replaying current track');
        audioElements.playActive();
      } else if (hasNextTrack) {
        logger.debug('[Player] Playing next track in queue');
        handlePlayNext(false);
      } else {
        // No more tracks in queue - try autoplay
        await triggerAutoplay(crossfadeSettings.enabled);
      }
    };

    audioA.addEventListener('ended', handleEnded);
    audioB.addEventListener('ended', handleEnded);
    return () => {
      audioA.removeEventListener('ended', handleEnded);
      audioB.removeEventListener('ended', handleEnded);
    };
  }, [audioElements, crossfade.isCrossfading, playTracking, queue, handlePlayNext, autoplaySettings.enabled, currentTrack, radio.isRadioMode, triggerAutoplay, crossfadeSettings.enabled]);

  // ========== AUTOPLAY PREFETCH ==========
  // Prefetch similar artist tracks when nearing end of queue for instant playback
  useEffect(() => {
    if (!autoplaySettings.enabled || radio.isRadioMode || !currentTrack?.artistId) {
      return;
    }

    const tracksRemaining = queue.queue.length - queue.currentIndex - 1;
    const threshold = autoplay.getPrefetchThreshold();

    // Start prefetch when we're within threshold of queue end
    if (tracksRemaining <= threshold && tracksRemaining >= 0) {
      logger.debug(`[Player] ${tracksRemaining} tracks remaining, prefetching autoplay tracks`);
      const currentQueueIds = new Set(queue.queue.map(t => t.id));
      autoplay.prefetchSimilarArtistTracks(currentTrack.artistId, currentQueueIds);
    }
  }, [autoplaySettings.enabled, radio.isRadioMode, currentTrack, queue.currentIndex, queue.queue, autoplay]);

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

  // ========== AUTOPLAY SETTINGS ==========

  const setAutoplayEnabled = useCallback((enabled: boolean) => {
    setAutoplayEnabledStorage(enabled);
  }, [setAutoplayEnabledStorage]);

  // ========== CONTEXT VALUE ==========

  const value: PlayerContextValue = useMemo(
    () => ({
      // Track state
      currentTrack,
      queue: queue.queue,
      currentIndex: queue.currentIndex,
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

      // Autoplay state
      autoplay: autoplaySettings,
      isAutoplayActive,
      autoplaySourceArtist,

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

      // Autoplay controls
      setAutoplayEnabled,
    }),
    [
      currentTrack,
      queue.queue,
      queue.currentIndex,
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
      autoplaySettings,
      isAutoplayActive,
      autoplaySourceArtist,
      setAutoplayEnabled,
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
