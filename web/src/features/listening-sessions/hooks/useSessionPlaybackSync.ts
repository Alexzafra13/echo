import { useEffect, useRef, useContext, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { PlayerContext } from '@features/player/context/PlayerContext';
import { apiClient } from '@shared/services/api';
import { useSessionStore } from '../store/sessionStore';
import { logger } from '@shared/utils/logger';
import type { Track } from '@shared/types/track.types';

// Umbral de desfase para corregir posicion (3 segundos)
const DRIFT_THRESHOLD = 3;
// Intervalo de sync del host (5 segundos)
const SYNC_INTERVAL = 5000;

/**
 * Sincroniza la reproduccion entre host y participantes via WebSocket.
 *
 * Host: emite su estado cada 5s + eventos inmediatos
 * Participante: recibe eventos, carga tracks y sincroniza posicion
 */
export function useSessionPlaybackSync(
  socket: Socket | null,
  sessionId: string | null,
  isHost: boolean,
) {
  const playerCtx = useContext(PlayerContext);
  const isReceivingSyncRef = useRef(false);
  const lastSyncedTrackIdRef = useRef<string | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTrackIdRef = useRef<string | null>(null);
  const prevIsPlayingRef = useRef<boolean>(false);

  // Fetch de datos completos de un track por ID
  const fetchTrack = useCallback(async (trackId: string): Promise<Track | null> => {
    try {
      const { data } = await apiClient.get(`/tracks/${trackId}`);
      return data as Track;
    } catch {
      logger.error('[SessionSync] No se pudo cargar track:', trackId);
      return null;
    }
  }, []);

  // ============================================
  // HOST: emitir estado de reproduccion
  // ============================================
  useEffect(() => {
    if (!socket || !sessionId || !isHost || !playerCtx) return;

    // Sync periodico cada 5s
    syncIntervalRef.current = setInterval(() => {
      if (!playerCtx.currentTrack || isReceivingSyncRef.current) return;

      socket.emit('session:playback-update', {
        trackId: playerCtx.currentTrack.id,
        position: playerCtx.currentTime,
        isPlaying: playerCtx.isPlaying,
      });
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [socket, sessionId, isHost, playerCtx]);

  // Host: emitir eventos inmediatos al cambiar track o play/pause
  useEffect(() => {
    if (!socket || !isHost || !playerCtx || isReceivingSyncRef.current) return;

    const currentId = playerCtx.currentTrack?.id ?? null;

    // Track cambio
    if (currentId && currentId !== prevTrackIdRef.current) {
      prevTrackIdRef.current = currentId;

      // Enviar datos completos del track para que los participantes no necesiten fetch
      const trackData = playerCtx.currentTrack;
      socket.emit('session:track-change', {
        trackId: currentId,
        trackData,
      });
      logger.info('[SessionSync] Host cambio track:', currentId);
    }

    // Play/pause cambio
    if (playerCtx.isPlaying !== prevIsPlayingRef.current) {
      prevIsPlayingRef.current = playerCtx.isPlaying;
      if (playerCtx.isPlaying) {
        socket.emit('session:play');
        logger.info('[SessionSync] Host play');
      } else {
        socket.emit('session:pause');
        logger.info('[SessionSync] Host pause');
      }
    }
  }, [socket, isHost, playerCtx?.currentTrack?.id, playerCtx?.isPlaying]);

  // ============================================
  // PARTICIPANTE: recibir y sincronizar
  // ============================================
  useEffect(() => {
    if (!socket || !sessionId || isHost || !playerCtx) return;

    // Track cambio — el host envio datos del track
    const handleTrackChange = async (data: { trackId: string; trackData?: Track }) => {
      isReceivingSyncRef.current = true;

      try {
        // Usar datos enviados por el host, o hacer fetch si no vienen
        let track = data.trackData;
        if (!track || !track.id) {
          track = await fetchTrack(data.trackId) as Track;
        }

        if (track) {
          playerCtx.playQueue([track], 0);
          lastSyncedTrackIdRef.current = track.id;
          logger.info('[SessionSync] Participante cargo track:', track.title);
        }
      } finally {
        setTimeout(() => { isReceivingSyncRef.current = false; }, 1000);
      }
    };

    // Play inmediato
    const handlePlay = () => {
      if (!playerCtx.isPlaying && playerCtx.currentTrack) {
        isReceivingSyncRef.current = true;
        playerCtx.togglePlayPause();
        setTimeout(() => { isReceivingSyncRef.current = false; }, 500);
        logger.info('[SessionSync] Participante play');
      }
    };

    // Pause inmediato
    const handlePause = () => {
      if (playerCtx.isPlaying) {
        isReceivingSyncRef.current = true;
        playerCtx.togglePlayPause();
        setTimeout(() => { isReceivingSyncRef.current = false; }, 500);
        logger.info('[SessionSync] Participante pause');
      }
    };

    // Seek inmediato
    const handleSeek = (data: { position: number }) => {
      playerCtx.seek(data.position);
    };

    // Sync periodico — corregir drift
    const handleSync = (data: { trackId: string; position: number; isPlaying: boolean }) => {
      useSessionStore.getState().setHostPlaybackState(data);

      // Si no tenemos track cargado o es diferente, cargar
      if (!playerCtx.currentTrack || playerCtx.currentTrack.id !== data.trackId) {
        // Track diferente — hacer fetch y cargar
        handleTrackChange({ trackId: data.trackId });
        return;
      }

      // Mismo track — corregir posicion si hay drift
      const drift = Math.abs(playerCtx.currentTime - data.position);
      if (drift > DRIFT_THRESHOLD) {
        logger.info(`[SessionSync] Corrigiendo drift: ${drift.toFixed(1)}s`);
        playerCtx.seek(data.position);
      }

      // Sincronizar play/pause
      if (data.isPlaying && !playerCtx.isPlaying && playerCtx.currentTrack) {
        isReceivingSyncRef.current = true;
        playerCtx.togglePlayPause();
        setTimeout(() => { isReceivingSyncRef.current = false; }, 500);
      } else if (!data.isPlaying && playerCtx.isPlaying) {
        isReceivingSyncRef.current = true;
        playerCtx.togglePlayPause();
        setTimeout(() => { isReceivingSyncRef.current = false; }, 500);
      }
    };

    socket.on('session:host-track-change', handleTrackChange);
    socket.on('session:host-play', handlePlay);
    socket.on('session:host-pause', handlePause);
    socket.on('session:host-seek', handleSeek);
    socket.on('session:sync', handleSync);

    return () => {
      socket.off('session:host-track-change', handleTrackChange);
      socket.off('session:host-play', handlePlay);
      socket.off('session:host-pause', handlePause);
      socket.off('session:host-seek', handleSeek);
      socket.off('session:sync', handleSync);
    };
  }, [socket, sessionId, isHost, playerCtx, fetchTrack]);

  return { isReceivingSync: isReceivingSyncRef.current };
}
