import { useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { usePlayback, useQueue } from '@features/player';
import { apiClient } from '@shared/services/api';
import { useSessionStore } from '../store/sessionStore';
import { logger } from '@shared/utils/logger';
import type { Track } from '@shared/types/track.types';
import type { SessionQueueItem } from '../types';

// Umbral de desfase para corregir posicion (3 segundos)
const DRIFT_THRESHOLD = 3;
// Intervalo de sync del host (5 segundos)
const SYNC_INTERVAL = 5000;

/**
 * Convierte un SessionQueueItem a un Track parcial para el reproductor.
 * Incluye albumId para que se genere la caratula correctamente.
 */
function sessionQueueItemToTrack(item: SessionQueueItem): Track {
  return {
    id: item.trackId,
    title: item.trackTitle,
    artistName: item.artistName,
    artist: item.artistName,
    albumId: item.albumId,
    albumName: item.albumName,
    duration: item.trackDuration,
  };
}

/**
 * Sincroniza la reproduccion entre host y participantes via WebSocket.
 * Incluye sincronizacion de cola completa para que todos vean las mismas canciones.
 */
export function useSessionPlaybackSync(
  socket: Socket | null,
  sessionId: string | null,
  isHost: boolean,
  shouldSync: boolean = true
) {
  const { currentTrack, currentTime, isPlaying, togglePlayPause, seek } = usePlayback();
  const { queue, playQueue, addToQueue } = useQueue();
  const isReceivingSyncRef = useRef(false);
  const lastSyncedTrackIdRef = useRef<string | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTrackIdRef = useRef<string | null>(null);
  const prevIsPlayingRef = useRef<boolean>(false);

  // Fetch completo de un track por ID
  const fetchTrack = useCallback(async (trackId: string): Promise<Track | null> => {
    try {
      const { data } = await apiClient.get(`/tracks/${trackId}`);
      return data as Track;
    } catch {
      logger.error('[SessionSync] No se pudo cargar track:', trackId);
      return null;
    }
  }, []);

  // Cargar cola de sesion en el reproductor
  const loadSessionQueue = useCallback(
    async (queueItems: SessionQueueItem[], currentTrackId?: string) => {
      if (queueItems.length === 0) return;

      // Filtrar solo los no reproducidos
      const pending = queueItems.filter((q) => !q.played).sort((a, b) => a.position - b.position);
      if (pending.length === 0) return;

      // Convertir a Tracks — fetch completo para tener caratulas
      const tracks: Track[] = [];
      for (const item of pending) {
        try {
          const full = await fetchTrack(item.trackId);
          tracks.push(full ?? sessionQueueItemToTrack(item));
        } catch {
          tracks.push(sessionQueueItemToTrack(item));
        }
      }

      // Encontrar indice del track actual
      const currentIndex = currentTrackId ? tracks.findIndex((t) => t.id === currentTrackId) : 0;

      playQueue(tracks, Math.max(currentIndex, 0));
      logger.info(`[SessionSync] Cola cargada: ${tracks.length} tracks, indice: ${currentIndex}`);
    },
    [playQueue, fetchTrack]
  );

  // ============================================
  // HOST: emitir estado de reproduccion + cola
  // ============================================
  useEffect(() => {
    if (!socket || !sessionId || !isHost || !shouldSync) return;

    // Sync periodico cada 5s
    syncIntervalRef.current = setInterval(() => {
      if (!currentTrack || isReceivingSyncRef.current) return;

      socket.emit('session:playback-update', {
        trackId: currentTrack.id,
        position: currentTime,
        isPlaying: isPlaying,
      });
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [socket, sessionId, isHost, shouldSync, currentTrack, currentTime, isPlaying]);

  // Host: emitir eventos inmediatos al cambiar track o play/pause
  useEffect(() => {
    if (!socket || !isHost || isReceivingSyncRef.current) return;

    const currentId = currentTrack?.id ?? null;

    // Track cambio
    if (currentId && currentId !== prevTrackIdRef.current) {
      prevTrackIdRef.current = currentId;

      socket.emit('session:track-change', {
        trackId: currentId,
        trackData: currentTrack,
        // Enviar la cola completa del reproductor para que participantes la sincronicen
        queue: queue?.map((t: Track) => ({
          trackId: t.id,
          trackTitle: t.title,
          trackDuration: t.duration,
          artistName: t.artistName || t.artist,
          albumName: t.albumName,
          albumId: t.albumId,
        })),
      });
      logger.info('[SessionSync] Host cambio track:', currentId);
    }

    // Play/pause cambio
    if (isPlaying !== prevIsPlayingRef.current) {
      prevIsPlayingRef.current = isPlaying;
      if (isPlaying) {
        socket.emit('session:play');
      } else {
        socket.emit('session:pause');
      }
    }
  }, [socket, isHost, currentTrack?.id, isPlaying]);

  // HOST: responder a peticiones de estado (reconexion de participantes)
  useEffect(() => {
    if (!socket || !isHost || !shouldSync) return;

    const handleStateRequest = () => {
      if (!currentTrack) return;
      socket.emit('session:state-response', {
        trackId: currentTrack.id,
        position: currentTime,
        isPlaying: isPlaying,
        trackData: currentTrack,
        queue: queue?.map((t: Track) => ({
          trackId: t.id,
          trackTitle: t.title,
          trackDuration: t.duration,
          artistName: t.artistName || t.artist,
          albumName: t.albumName,
          albumId: t.albumId,
        })),
      });
    };

    socket.on('session:state-requested', handleStateRequest);
    return () => {
      socket.off('session:state-requested', handleStateRequest);
    };
  }, [socket, isHost, currentTrack, currentTime, isPlaying, queue, shouldSync]);

  // ============================================
  // PARTICIPANTE: recibir y sincronizar
  // ============================================
  useEffect(() => {
    if (!socket || !sessionId || isHost || !shouldSync) return;

    // Track cambio — el host envio datos del track + cola
    const handleTrackChange = async (data: {
      trackId: string;
      trackData?: Track;
      queue?: Array<{
        trackId: string;
        trackTitle: string;
        trackDuration: number;
        artistName?: string;
        albumName?: string;
        albumId?: string;
      }>;
    }) => {
      isReceivingSyncRef.current = true;

      try {
        // Si viene la cola completa del host, cargarla toda
        if (data.queue && data.queue.length > 0) {
          const tracks: Track[] = [];
          for (const item of data.queue) {
            try {
              const full = await fetchTrack(item.trackId);
              tracks.push(
                full ??
                  ({
                    id: item.trackId,
                    title: item.trackTitle,
                    artistName: item.artistName,
                    albumId: item.albumId,
                    albumName: item.albumName,
                    duration: item.trackDuration,
                  } as Track)
              );
            } catch {
              tracks.push({
                id: item.trackId,
                title: item.trackTitle,
                artistName: item.artistName,
                albumId: item.albumId,
                duration: item.trackDuration,
              } as Track);
            }
          }

          const currentIndex = tracks.findIndex((t) => t.id === data.trackId);
          playQueue(tracks, Math.max(currentIndex, 0));
          lastSyncedTrackIdRef.current = data.trackId;
          logger.info(`[SessionSync] Participante cargo cola: ${tracks.length} tracks`);
        } else {
          // Sin cola — cargar solo el track individual
          let track = data.trackData;
          if (!track || !track.id) {
            track = (await fetchTrack(data.trackId)) as Track;
          }
          if (track) {
            playQueue([track], 0);
            lastSyncedTrackIdRef.current = track.id;
          }
        }
      } finally {
        setTimeout(() => {
          isReceivingSyncRef.current = false;
        }, 1000);
      }
    };

    const handlePlay = () => {
      if (!isPlaying && currentTrack) {
        isReceivingSyncRef.current = true;
        togglePlayPause();
        setTimeout(() => {
          isReceivingSyncRef.current = false;
        }, 500);
      }
    };

    const handlePause = () => {
      if (isPlaying) {
        isReceivingSyncRef.current = true;
        togglePlayPause();
        setTimeout(() => {
          isReceivingSyncRef.current = false;
        }, 500);
      }
    };

    const handleSeek = (data: { position: number }) => {
      seek(data.position);
    };

    // Sync periodico — corregir drift
    const handleSync = (data: { trackId: string; position: number; isPlaying: boolean }) => {
      useSessionStore.getState().setHostPlaybackState(data);

      if (!currentTrack || currentTrack.id !== data.trackId) {
        handleTrackChange({ trackId: data.trackId });
        return;
      }

      const drift = Math.abs(currentTime - data.position);
      if (drift > DRIFT_THRESHOLD) {
        logger.info(`[SessionSync] Corrigiendo drift: ${drift.toFixed(1)}s`);
        seek(data.position);
      }

      if (data.isPlaying && !isPlaying && currentTrack) {
        isReceivingSyncRef.current = true;
        togglePlayPause();
        setTimeout(() => {
          isReceivingSyncRef.current = false;
        }, 500);
      } else if (!data.isPlaying && isPlaying) {
        isReceivingSyncRef.current = true;
        togglePlayPause();
        setTimeout(() => {
          isReceivingSyncRef.current = false;
        }, 500);
      }
    };

    // Cola actualizada por WebSocket (alguien añadio/elimino cancion)
    const handleQueueUpdated = (data: { queue: SessionQueueItem[] }) => {
      if (!data.queue || isReceivingSyncRef.current) return;
      // Actualizar la cola en el reproductor sin interrumpir la reproduccion actual
      const pending = data.queue.filter((q) => !q.played).sort((a, b) => a.position - b.position);
      if (pending.length > 0) {
        // Solo añadir tracks nuevos que no esten ya en la cola del reproductor
        const currentQueueIds = new Set(queue?.map((t: Track) => t.id) || []);
        const newItems = pending.filter((item) => !currentQueueIds.has(item.trackId));
        if (newItems.length > 0) {
          const newTracks = newItems.map(sessionQueueItemToTrack);
          for (const t of newTracks) {
            addToQueue(t);
          }
          logger.info(`[SessionSync] Añadidas ${newTracks.length} canciones a la cola`);
        }
      }
    };

    // Estado completo del host (respuesta a request-state, reconexion)
    const handleFullState = async (data: {
      trackId: string;
      position: number;
      isPlaying: boolean;
      trackData?: Track;
      queue?: Array<{
        trackId: string;
        trackTitle: string;
        trackDuration: number;
        artistName?: string;
        albumName?: string;
        albumId?: string;
      }>;
    }) => {
      logger.info('[SessionSync] Recibido estado completo del host');
      // Cargar cola + track como si fuera un track-change
      await handleTrackChange({
        trackId: data.trackId,
        trackData: data.trackData,
        queue: data.queue,
      });
      // Sincronizar posicion exacta
      setTimeout(() => {
        seek(data.position);
        if (data.isPlaying && !isPlaying && currentTrack) {
          isReceivingSyncRef.current = true;
          togglePlayPause();
          setTimeout(() => {
            isReceivingSyncRef.current = false;
          }, 500);
        }
      }, 500);
    };

    socket.on('session:host-track-change', handleTrackChange);
    socket.on('session:host-play', handlePlay);
    socket.on('session:host-pause', handlePause);
    socket.on('session:host-seek', handleSeek);
    socket.on('session:sync', handleSync);
    socket.on('session:queue-updated', handleQueueUpdated);
    socket.on('session:full-state', handleFullState);

    // Al conectar/reconectar, pedir estado al host inmediatamente
    socket.emit('session:request-state');
    logger.info('[SessionSync] Solicitando estado al host');

    return () => {
      socket.off('session:host-track-change', handleTrackChange);
      socket.off('session:host-play', handlePlay);
      socket.off('session:host-pause', handlePause);
      socket.off('session:host-seek', handleSeek);
      socket.off('session:sync', handleSync);
      socket.off('session:queue-updated', handleQueueUpdated);
      socket.off('session:full-state', handleFullState);
    };
  }, [
    socket,
    sessionId,
    isHost,
    shouldSync,
    currentTrack,
    isPlaying,
    togglePlayPause,
    seek,
    queue,
    playQueue,
    addToQueue,
    fetchTrack,
  ]);

  return { isReceivingSync: isReceivingSyncRef.current, loadSessionQueue };
}
