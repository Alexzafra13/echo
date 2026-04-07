import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePlayback, useQueue } from '@features/player';
import { listeningSessionsService } from '../services/listening-sessions.service';
import { getFriends } from '@features/social/services/social.service';
import type { Track } from '@shared/types/track.types';
import type { ListeningSession, SessionQueueItem } from '../types';

interface SessionFriend {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

/** Hook para búsqueda de tracks con debounce */
export function useTrackSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { apiClient } = await import('@shared/services/api');
        const { data } = await apiClient.get(`/tracks/search/${encodeURIComponent(query)}`, {
          params: { limit: 8 },
        });
        setResults(((data as { data?: unknown[] }).data ?? []) as Track[]);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return { query, setQuery, results, searching, clear };
}

/** Hook para cargar amigos disponibles para invitar */
export function useSessionFriends(isHost: boolean, participants?: Array<{ userId: string }>) {
  const [friends, setFriends] = useState<SessionFriend[]>([]);

  useEffect(() => {
    if (!isHost) return;
    const participantIds = new Set(participants?.map((p) => p.userId) ?? []);
    getFriends()
      .then((list) =>
        setFriends(
          list
            .filter((f) => !participantIds.has(f.id))
            .map((f) => ({ id: f.id, username: f.username, name: f.name, avatarUrl: f.avatarUrl }))
        )
      )
      .catch(() => setFriends([]));
  }, [isHost, participants]);

  return friends;
}

/** Hook para cargar recomendaciones de la sesión */
export function useSessionRecommendations(sessionId?: string) {
  const [recommendations, setRecommendations] = useState<Track[]>([]);

  useEffect(() => {
    if (!sessionId || recommendations.length > 0) return;
    listeningSessionsService
      .getSessionRecommendations(sessionId)
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
    // Solo al montar con el sessionId
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Carga inicial, no queremos re-fetch con cada cambio
  }, [sessionId]);

  return recommendations;
}

/** Hook para sincronizar la cola de sesión con el reproductor al entrar */
export function useSessionQueueSync(session: ListeningSession | undefined, shouldSync: boolean) {
  const { currentTrack } = usePlayback();
  const { playQueue } = useQueue();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!session?.id || loadedRef.current || !shouldSync) return;
    const pending = (session.queue ?? []).filter((q: SessionQueueItem) => !q.played);
    if (pending.length === 0 || currentTrack) return;

    loadedRef.current = true;
    const loadQueue = async () => {
      const { apiClient } = await import('@shared/services/api');
      const tracks: Track[] = [];
      for (const item of pending.sort(
        (a: SessionQueueItem, b: SessionQueueItem) => a.position - b.position
      )) {
        try {
          const { data } = await apiClient.get(`/tracks/${item.trackId}`);
          tracks.push(data as Track);
        } catch {
          // Fallback con datos parciales si el fetch falla
          tracks.push({
            id: item.trackId,
            title: item.trackTitle,
            artistName: item.artistName,
            albumId: item.albumId,
            duration: item.trackDuration,
          } as Track);
        }
      }
      if (tracks.length > 0) playQueue(tracks, 0);
    };
    loadQueue();
    // Solo al cargar la sesión o cambiar la cola
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Sincronización inicial de cola
  }, [session?.id, session?.queue?.length]);
}

/** Hook para añadir tracks a la sesión + reproductor */
export function useAddTrackToSession(sessionId: string | undefined, shouldSyncPlayback: boolean) {
  const { currentTrack, isPlaying } = usePlayback();
  const { playQueue, addToQueue } = useQueue();
  const queryClient = useQueryClient();
  const [addedTrackId, setAddedTrackId] = useState<string | null>(null);

  const addTrack = useCallback(
    async (trackId: string) => {
      if (!sessionId) return;
      try {
        await listeningSessionsService.addToQueue(sessionId, { trackId });

        // Solo reproducir localmente si corresponde (host siempre, participante solo en sync)
        if (shouldSyncPlayback) {
          const { apiClient } = await import('@shared/services/api');
          const { data: fullTrack } = await apiClient.get(`/tracks/${trackId}`);
          const track = fullTrack as Track;

          if (!currentTrack && !isPlaying) {
            playQueue([track], 0);
          } else {
            addToQueue(track);
          }
        }

        queryClient.invalidateQueries({ queryKey: ['listening-session', sessionId] });
        setAddedTrackId(trackId);
        setTimeout(() => setAddedTrackId(null), 2000);
      } catch {
        // Error silencioso — el WebSocket propagará si hubo éxito parcial
      }
    },
    [sessionId, shouldSyncPlayback, currentTrack, isPlaying, playQueue, addToQueue, queryClient]
  );

  return { addTrack, addedTrackId };
}
