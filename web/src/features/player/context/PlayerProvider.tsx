/**
 * PlayerProvider — Orquestador central del reproductor.
 *
 * Internamente llama a todos los hooks especializados y distribuye
 * sus valores en 4 contextos independientes (Queue, Playback, Radio,
 * Autoplay). Esto permite que los consumidores se suscriban solo al
 * contexto que necesitan, reduciendo re-renders innecesarios.
 *
 * Para compatibilidad hacia atrás, también provee un PlayerContext
 * combinado que expone la interfaz completa PlayerContextValue.
 */

import { useState, useCallback, useMemo, useEffect, useRef, ReactNode } from 'react';
import { Track, RadioStation, PlayContext, DEFAULT_VOLUME } from '../types';
import { usePlayerSettingsStore } from '../store';
import {
  setCurrentTime as timeStoreSetCurrentTime,
  setDuration as timeStoreSetDuration,
  resetTime as timeStoreResetTime,
  getCurrentTime as timeStoreGetCurrentTime,
  getDuration as timeStoreGetDuration,
} from '../store/timeStore';
import { useAudioElements } from '../hooks/useAudioElements';
import { usePlayTracking } from '../hooks/usePlayTracking';
import { useQueueManagement } from '../hooks/useQueueManagement';
import { useCrossfadeLogic } from '../hooks/useCrossfadeLogic';
import { useRadioPlayback } from '../hooks/useRadioPlayback';
import { useAutoplay } from '../hooks/useAutoplay';
import { useTrackPlayback } from '../hooks/useTrackPlayback';
import { useTrackTransitions } from '../hooks/useTrackTransitions';
import type { PlayerSharedRefs } from '../hooks/playerSharedRefs';
import { useRadioMetadata } from '@features/radio';
import { logger } from '@shared/utils/logger';
import { useMediaSession } from '../hooks/useMediaSession';
import { useSocialSync } from '../hooks/useSocialSync';
import { useRadioSignalSync } from '../hooks/useRadioSignalSync';
import { useVisibilitySync } from '../hooks/useVisibilitySync';
import type { RadioBrowserStation } from '@shared/types/radio.types';

import { QueueContext, type QueueContextValue } from './QueueContext';
import { PlaybackContext, type PlaybackContextValue } from './PlaybackContext';
import { RadioContext, type RadioContextValue } from './RadioContext';
import { AutoplayContext, type AutoplayContextValue } from './AutoplayContext';

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
  // currentTime y duration viven en timeStore (fuera de React) para evitar
  // que cada timeupdate (~4/s) re-renderice todo el árbol de contextos.
  // Los componentes que muestran el tiempo usan useCurrentTime() directamente.
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
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
  const sharedRefs: PlayerSharedRefs = useMemo(
    () => ({ isTransitioningRef, preloadedNextRef, queueContextRef }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Objeto contenedor estable; los refs internos son mutables por diseño
    []
  );

  // ========== AUDIO ELEMENTS ==========
  const audioElements = useAudioElements({
    initialVolume: DEFAULT_VOLUME,
    callbacks: {
      onPlay: () => setIsPlaying(true),
      onPause: () => {
        if (!isTransitioningRef.current) {
          setIsPlaying(false);
        }
      },
      onTimeUpdate: (time) => timeStoreSetCurrentTime(time),
      onDurationChange: (dur) => timeStoreSetDuration(dur),
      onEnded: () => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Solo actualizar cuando cambian los metadatos; radio.setMetadata es estable
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
    autoplaySettings,
    sharedRefs,
    radio: { isRadioMode: radio.isRadioMode },
    handlePlayNext,
    getStreamUrl,
  });

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

  const stop = useCallback(async () => {
    await audioElements.stopBoth();
    setCurrentTrack(null);
    setIsPlaying(false);
    timeStoreResetTime();
  }, [audioElements]);

  const seek = useCallback(
    (time: number) => {
      audioElements.seek(time);
      timeStoreSetCurrentTime(time);
      crossfade.resetCrossfadeFlag();
    },
    [audioElements, crossfade]
  );

  const setVolume = useCallback(
    (volume: number) => {
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
    async (tracks: Track[], startIndex: number = 0, context?: PlayContext) => {
      setIsAutoplayActive(false);
      setAutoplaySourceArtist(null);
      autoplay.resetSession();
      queueContextRef.current = context;

      // Parar radio ANTES de setear la queue y reproducir.
      // Sin esto, playTrack → stopRadio → stopBoth() mata el audio
      // que playTrack acaba de cargar (race condition).
      if (radio.isRadioMode) {
        await radio.stopRadio();
      }

      queue.setQueue(tracks, startIndex);
      if (tracks[startIndex]) {
        playTrack(tracks[startIndex], false);
      }
    },
    [queue, playTrack, autoplay, radio]
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
    currentTrack,
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
    timeStoreResetTime();
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

  // ========== CONTEXT VALUES (memoized independently) ==========

  const queueValue: QueueContextValue = useMemo(
    () => ({
      queue: queue.queue,
      currentIndex: queue.currentIndex,
      isShuffle: queue.isShuffle,
      repeatMode: queue.repeatMode,
      addToQueue: queue.addToQueue,
      removeFromQueue,
      clearQueue: queue.clearQueue,
      playQueue,
      toggleShuffle: queue.toggleShuffle,
      setShuffle: queue.setShuffle,
      toggleRepeat: queue.toggleRepeat,
    }),
    [
      queue.queue,
      queue.currentIndex,
      queue.isShuffle,
      queue.repeatMode,
      queue.addToQueue,
      queue.clearQueue,
      queue.toggleShuffle,
      queue.setShuffle,
      queue.toggleRepeat,
      removeFromQueue,
      playQueue,
    ]
  );

  // currentTime y duration se leen vía useCurrentTime() en los componentes
  // que los necesitan. Aquí se exponen como 0 para backward compat del tipo,
  // pero los consumidores reales (ProgressBar, etc.) usan useCurrentTime().
  const playbackValue: PlaybackContextValue = useMemo(
    () => ({
      currentTrack,
      isPlaying,
      volume: audioElements.volume,
      currentTime: timeStoreGetCurrentTime(),
      duration: timeStoreGetDuration(),
      crossfade: crossfadeSettings,
      isCrossfading: crossfade.isCrossfading,
      volumeControlSupported: audioElements.volumeControlSupported,
      play,
      pause,
      togglePlayPause,
      stop,
      seek,
      setVolume,
      playNext,
      playPrevious,
      setCrossfadeEnabled,
    }),
    [
      currentTrack,
      isPlaying,
      audioElements.volume,
      crossfadeSettings,
      crossfade.isCrossfading,
      audioElements.volumeControlSupported,
      play,
      pause,
      togglePlayPause,
      stop,
      seek,
      setVolume,
      playNext,
      playPrevious,
      setCrossfadeEnabled,
    ]
  );

  const radioValue: RadioContextValue = useMemo(
    () => ({
      currentRadioStation: radio.currentStation,
      isRadioMode: radio.isRadioMode,
      radioMetadata: radio.metadata,
      radioSignalStatus: radio.signalStatus,
      playRadio,
      stopRadio,
    }),
    [
      radio.currentStation,
      radio.isRadioMode,
      radio.metadata,
      radio.signalStatus,
      playRadio,
      stopRadio,
    ]
  );

  const autoplayValue: AutoplayContextValue = useMemo(
    () => ({
      autoplay: autoplaySettings,
      isAutoplayActive,
      autoplaySourceArtist,
      setAutoplayEnabled,
    }),
    [autoplaySettings, isAutoplayActive, autoplaySourceArtist, setAutoplayEnabled]
  );

  return (
    <QueueContext.Provider value={queueValue}>
      <PlaybackContext.Provider value={playbackValue}>
        <RadioContext.Provider value={radioValue}>
          <AutoplayContext.Provider value={autoplayValue}>{children}</AutoplayContext.Provider>
        </RadioContext.Provider>
      </PlaybackContext.Provider>
    </QueueContext.Provider>
  );
}
