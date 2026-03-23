/**
 * Contexto central del reproductor. Orquesta cola, crossfade, radio y reproducción de pistas.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { Track, PlayerContextValue, RadioStation, PlayContext } from '../types';
import { usePlayerSettingsStore } from '../store';
import { useAudioElements } from '../hooks/useAudioElements';
import { usePlayTracking } from '../hooks/usePlayTracking';
import { useQueueManagement } from '../hooks/useQueueManagement';
import { useCrossfadeLogic } from '../hooks/useCrossfadeLogic';
import { useRadioPlayback } from '../hooks/useRadioPlayback';
import { useAutoplay } from '../hooks/useAutoplay';
import { useTrackPlayback } from '../hooks/useTrackPlayback';
import { useTrackTransitions } from '../hooks/useTrackTransitions';
import type { PlayerSharedRefs } from '../hooks/playerSharedRefs';
import { useRadioMetadata } from '@features/radio/hooks/useRadioMetadata';
import { logger } from '@shared/utils/logger';
import { useMediaSession } from '../hooks/useMediaSession';
import { useSocialSync } from '../hooks/useSocialSync';
import { useRadioSignalSync } from '../hooks/useRadioSignalSync';
import { useVisibilitySync } from '../hooks/useVisibilitySync';
import type { RadioBrowserStation } from '@shared/types/radio.types';

export const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  // ========== SETTINGS ==========
  const crossfadeSettings = usePlayerSettingsStore((s) => s.crossfade);
  const autoplaySettings = usePlayerSettingsStore((s) => s.autoplay);
  const setCrossfadeEnabledStore = usePlayerSettingsStore((s) => s.setCrossfadeEnabled);
  const setAutoplayEnabledStore = usePlayerSettingsStore((s) => s.setAutoplayEnabled);

  const autoplay = useAutoplay();

  // ========== STATE ==========
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [userVolume, setUserVolumeState] = useState(0.7);
  const [isAutoplayActive, setIsAutoplayActive] = useState(false);
  const [autoplaySourceArtist, setAutoplaySourceArtist] = useState<string | null>(null);

  // Refs for cross-hook communication (avoid circular dependencies)
  const playNextRef = useRef<(useCrossfade: boolean) => void>(() => {});
  const transitionsRef = useRef<() => void>(() => {});
  const isTransitioningRef = useRef(false);
  const preloadedNextRef = useRef<{
    trackId: string;
    nextIndex: number;
    track: Track;
  } | null>(null);
  const queueContextRef = useRef<PlayContext | undefined>(undefined);

  // Bundle refs into a single object for cleaner hook params.
  // useMemo([]): the object identity is stable, individual refs are mutable.
  const sharedRefs: PlayerSharedRefs = useMemo(
    () => ({ isTransitioningRef, preloadedNextRef, queueContextRef }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ========== AUDIO ELEMENTS ==========
  const audioElements = useAudioElements({
    initialVolume: 0.7,
    callbacks: {
      onPlay: () => setIsPlaying(true),
      onPause: () => {
        if (!isTransitioningRef.current) {
          setIsPlaying(false);
        }
      },
      onTimeUpdate: (time) => setCurrentTime(time),
      onDurationChange: (dur) => setDuration(dur),
      onEnded: () => {
        // Delegate to transitions hook via ref — the callback is captured in
        // useAudioElements' init effect, so we need ref indirection.
        transitionsRef.current();
      },
    },
  });

  // ========== QUEUE MANAGEMENT ==========
  const queue = useQueueManagement();

  // ========== PLAY TRACKING ==========
  const playTracking = usePlayTracking({
    audioElements,
    isShuffle: queue.isShuffle,
    isAutoplayActive,
  });

  // ========== RADIO PLAYBACK ==========
  const radio = useRadioPlayback({ audioElements });

  // ========== CROSSFADE LOGIC ==========
  const crossfade = useCrossfadeLogic({
    audioElements,
    settings: crossfadeSettings,
    isRadioMode: radio.isRadioMode,
    repeatMode: queue.repeatMode,
    hasNextTrack: queue.repeatMode === 'all' || queue.currentIndex < queue.queue.length - 1,
    onCrossfadeTrigger: () => {
      playTracking.endPlaySession(false);
      crossfade.isCrossfadingRef.current = true;
      playNextRef.current(true);
    },
  });

  // ========== RADIO METADATA ==========
  const { metadata: radioMetadata } = useRadioMetadata({
    stationUuid: radio.currentStation?.stationUuid || null,
    streamUrl: radio.currentStation?.url || null,
    isPlaying: isPlaying && radio.isRadioMode,
  });

  useEffect(() => {
    radio.setMetadata(radioMetadata);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radioMetadata]);

  useRadioSignalSync({
    audioRefA: audioElements.audioRefA,
    audioRefB: audioElements.audioRefB,
    isRadioMode: radio.isRadioMode,
    setSignalStatus: radio.setSignalStatus,
  });

  // ========== TRACK PLAYBACK ==========
  const { playTrack, getStreamUrl } = useTrackPlayback({
    audioElements,
    crossfade,
    crossfadeSettings,
    playTracking,
    radio,
    isPlaying,
    setIsPlaying,
    setCurrentTrack,
    sharedRefs,
  });

  // ========== QUEUE OPERATIONS ==========

  /**
   * Trigger autoplay with similar artists
   */
  const triggerAutoplay = useCallback(
    async (useCrossfade: boolean = false): Promise<boolean> => {
      const canAutoplay = autoplaySettings.enabled && currentTrack?.artistId && !radio.isRadioMode;

      if (!canAutoplay || !currentTrack?.artistId) {
        logger.debug('[Player] Cannot autoplay - conditions not met');
        setIsPlaying(false);
        setIsAutoplayActive(false);
        setAutoplaySourceArtist(null);
        crossfade.clearCrossfade();
        return false;
      }

      logger.debug('[Player] Triggering autoplay for artist:', currentTrack.artistId);

      const currentQueueIds = new Set(queue.queue.map((t) => t.id));
      const result = await autoplay.loadSimilarArtistTracks(currentTrack.artistId, currentQueueIds);

      if (result.tracks.length > 0) {
        logger.debug(
          `[Player] Autoplay: loaded ${result.tracks.length} tracks from similar artists`
        );
        setIsAutoplayActive(true);
        setAutoplaySourceArtist(result.sourceArtistName);
        queueContextRef.current = 'recommendation';

        const nextIndex = queue.queue.length;
        queue.addToQueue(result.tracks);
        queue.setCurrentIndex(nextIndex);
        playTrack(result.tracks[0], useCrossfade);
        return true;
      } else {
        logger.debug('[Player] Autoplay: no similar tracks found');
        setIsPlaying(false);
        setIsAutoplayActive(false);
        setAutoplaySourceArtist(null);
        crossfade.clearCrossfade();
        return false;
      }
    },
    [
      autoplaySettings.enabled,
      currentTrack,
      radio.isRadioMode,
      queue,
      autoplay,
      playTrack,
      crossfade,
    ]
  );

  /**
   * Handle playing next track
   */
  const handlePlayNext = useCallback(
    async (useCrossfade: boolean = false) => {
      if (queue.queue.length === 0) {
        crossfade.clearCrossfade();
        return;
      }

      if (playTracking.hasActiveSession()) {
        playTracking.endPlaySession(true);
      }

      const nextIndex = queue.getNextIndex();

      if (nextIndex === -1) {
        logger.debug('[Player] No next track in queue, attempting autoplay');
        await triggerAutoplay(useCrossfade);
        return;
      }

      queue.setCurrentIndex(nextIndex);
      const nextTrack = queue.getTrackAt(nextIndex);
      if (nextTrack) {
        playTrack(nextTrack, useCrossfade);
      }
    },
    [queue, playTracking, playTrack, triggerAutoplay, crossfade]
  );

  // Keep playNextRef current for crossfade callback
  useEffect(() => {
    playNextRef.current = handlePlayNext;
  }, [handlePlayNext]);

  // ========== TRACK TRANSITIONS ==========
  const { handleEnded } = useTrackTransitions({
    audioElements,
    crossfade,
    playTracking,
    queue,
    isPlaying,
    setIsPlaying,
    setCurrentTrack,
    currentTrack,
    userVolume,
    autoplaySettings,
    sharedRefs,
    radio: { isRadioMode: radio.isRadioMode },
    handlePlayNext,
    getStreamUrl,
  });

  // Wire the stable handleEnded into the ref that onEnded delegates to
  useEffect(() => {
    transitionsRef.current = handleEnded;
  }, [handleEnded]);

  // ========== PLAYBACK CONTROLS ==========

  const play = useCallback(
    (track?: Track, withCrossfade: boolean = false) => {
      if (track) {
        playTrack(track, withCrossfade);
      } else if (currentTrack && !radio.isRadioMode) {
        audioElements.playActive();
      } else if (radio.isRadioMode && radio.currentStation) {
        radio.resumeRadio();
      }
    },
    [playTrack, currentTrack, radio, audioElements]
  );

  const pause = useCallback(() => {
    audioElements.pauseActive();
  }, [audioElements]);

  const stop = useCallback(() => {
    audioElements.stopBoth();
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [audioElements]);

  const seek = useCallback(
    (time: number) => {
      audioElements.seek(time);
      setCurrentTime(time);
      crossfade.resetCrossfadeFlag();
    },
    [audioElements, crossfade]
  );

  const setVolume = useCallback(
    (volume: number) => {
      setUserVolumeState(volume);
      audioElements.setVolume(volume);
    },
    [audioElements]
  );

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  /**
   * Manual skip — never crossfade.
   */
  const playNext = useCallback(() => {
    handlePlayNext(false);
  }, [handlePlayNext]);

  const playPrevious = useCallback(() => {
    if (queue.queue.length === 0) return;

    if (audioElements.getCurrentTime() > 3) {
      seek(0);
      return;
    }

    if (playTracking.hasActiveSession()) {
      playTracking.endPlaySession(true);
    }

    const prevIndex = queue.getPreviousIndex();
    queue.setCurrentIndex(prevIndex);
    const prevTrack = queue.getTrackAt(prevIndex);
    if (prevTrack) {
      playTrack(prevTrack, false);
    }
  }, [queue, audioElements, playTracking, playTrack, seek]);

  const playQueue = useCallback(
    (tracks: Track[], startIndex: number = 0, context?: PlayContext) => {
      setIsAutoplayActive(false);
      setAutoplaySourceArtist(null);
      autoplay.resetSession();
      queueContextRef.current = context;

      queue.setQueue(tracks, startIndex);
      if (tracks[startIndex]) {
        playTrack(tracks[startIndex], false);
      }
    },
    [queue, playTrack, autoplay]
  );

  const removeFromQueue = useCallback(
    (index: number) => {
      const wasCurrentTrack = index === queue.currentIndex;
      queue.removeFromQueue(index);

      if (wasCurrentTrack && queue.queue.length > 0) {
        const nextTrack = queue.getTrackAt(queue.currentIndex);
        if (nextTrack) {
          playTrack(nextTrack, false);
        }
      }
    },
    [queue, playTrack]
  );

  // ========== AUTOPLAY PREFETCH ==========
  useEffect(() => {
    if (!autoplaySettings.enabled || radio.isRadioMode || !currentTrack?.artistId) return;

    const tracksRemaining = queue.queue.length - queue.currentIndex - 1;
    const threshold = autoplay.getPrefetchThreshold();

    if (tracksRemaining <= threshold && tracksRemaining >= 0) {
      logger.debug(`[Player] ${tracksRemaining} tracks remaining, prefetching autoplay tracks`);
      const currentQueueIds = new Set(queue.queue.map((t) => t.id));
      autoplay.prefetchSimilarArtistTracks(currentTrack.artistId, currentQueueIds);
    }
  }, [
    autoplaySettings.enabled,
    radio.isRadioMode,
    currentTrack,
    queue.currentIndex,
    queue.queue,
    autoplay,
  ]);

  // ========== MEDIA SESSION (mobile background playback) ==========
  useMediaSession({
    currentTrack,
    radio: {
      isRadioMode: radio.isRadioMode,
      currentStation: radio.currentStation,
      metadata: radio.metadata,
    },
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    stop,
    playPrevious,
    playNext,
    seek,
  });

  // ========== PWA VISIBILITY SYNC ==========
  useVisibilitySync({
    isPlaying,
    getActiveAudio: audioElements.getActiveAudio,
    setIsPlaying,
  });

  // ========== SOCIAL SYNC ==========
  useSocialSync({
    isPlaying,
    currentTrackId: currentTrack?.id ?? null,
    isRadioMode: radio.isRadioMode,
  });

  // ========== RADIO OPERATIONS ==========

  const playRadio = useCallback(
    async (station: RadioStation | RadioBrowserStation) => {
      try {
        setCurrentTrack(null);
        queue.clearQueue();
        crossfade.clearCrossfade();
        await radio.playRadio(station);
      } catch (error) {
        logger.error('[Player] Failed to play radio station:', (error as Error).message);
        setIsPlaying(false);
      }
    },
    [radio, queue, crossfade]
  );

  const stopRadio = useCallback(async () => {
    try {
      await radio.stopRadio();
    } catch (error) {
      logger.error('[Player] Failed to stop radio:', (error as Error).message);
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [radio]);

  // ========== SETTINGS CALLBACKS ==========

  const setCrossfadeEnabled = useCallback(
    (enabled: boolean) => setCrossfadeEnabledStore(enabled),
    [setCrossfadeEnabledStore]
  );

  const setAutoplayEnabled = useCallback(
    (enabled: boolean) => setAutoplayEnabledStore(enabled),
    [setAutoplayEnabledStore]
  );

  // ========== CONTEXT VALUE ==========

  const value: PlayerContextValue = useMemo(
    () => ({
      currentTrack,
      queue: queue.queue,
      currentIndex: queue.currentIndex,
      isPlaying,
      volume: userVolume,
      currentTime,
      duration,
      isShuffle: queue.isShuffle,
      repeatMode: queue.repeatMode,

      crossfade: crossfadeSettings,
      isCrossfading: crossfade.isCrossfading,
      volumeControlSupported: audioElements.volumeControlSupported,

      currentRadioStation: radio.currentStation,
      isRadioMode: radio.isRadioMode,
      radioMetadata: radio.metadata,
      radioSignalStatus: radio.signalStatus,

      autoplay: autoplaySettings,
      isAutoplayActive,
      autoplaySourceArtist,

      play,
      pause,
      togglePlayPause,
      stop,
      playNext,
      playPrevious,

      addToQueue: queue.addToQueue,
      removeFromQueue,
      clearQueue: queue.clearQueue,
      playQueue,

      playRadio,
      stopRadio,

      seek,
      setVolume,
      toggleShuffle: queue.toggleShuffle,
      setShuffle: queue.setShuffle,
      toggleRepeat: queue.toggleRepeat,

      setCrossfadeEnabled,
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
      audioElements.volumeControlSupported,
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
