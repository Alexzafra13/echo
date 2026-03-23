import { apiClient } from '@shared/services/api';
import type {
  ListeningSession,
  CreateSessionDto,
  JoinSessionDto,
  AddToQueueDto,
  UpdateParticipantRoleDto,
} from '../types';

/**
 * Listening Sessions API service
 */
export const listeningSessionsService = {
  getMyActiveSession: async (): Promise<ListeningSession | null> => {
    const { data } = await apiClient.get<ListeningSession | null>('/listening-sessions/my-active');
    return data;
  },

  createSession: async (dto: CreateSessionDto): Promise<{
    id: string;
    hostId: string;
    name: string;
    inviteCode: string;
    isActive: boolean;
    createdAt: string;
    message: string;
  }> => {
    const { data } = await apiClient.post('/listening-sessions', dto);
    return data;
  },

  joinSession: async (dto: JoinSessionDto): Promise<{
    sessionId: string;
    sessionName: string;
    hostId: string;
    role: string;
    message: string;
  }> => {
    const { data } = await apiClient.post('/listening-sessions/join', dto);
    return data;
  },

  getSession: async (id: string): Promise<ListeningSession> => {
    const { data } = await apiClient.get<ListeningSession>(`/listening-sessions/${id}`);
    return data;
  },

  getSessionByCode: async (code: string): Promise<ListeningSession> => {
    const { data } = await apiClient.get<ListeningSession>(`/listening-sessions/by-code/${code}`);
    return data;
  },

  addToQueue: async (sessionId: string, dto: AddToQueueDto): Promise<{
    sessionId: string;
    trackId: string;
    position: number;
    addedBy: string;
    message: string;
  }> => {
    const { data } = await apiClient.post(`/listening-sessions/${sessionId}/queue`, dto);
    return data;
  },

  skipTrack: async (sessionId: string): Promise<{
    sessionId: string;
    nextTrackId?: string;
    nextTrackTitle?: string;
    position: number;
    message: string;
  }> => {
    const { data } = await apiClient.post(`/listening-sessions/${sessionId}/skip`);
    return data;
  },

  updateParticipantRole: async (
    sessionId: string,
    userId: string,
    dto: UpdateParticipantRoleDto,
  ): Promise<void> => {
    await apiClient.patch(`/listening-sessions/${sessionId}/participants/${userId}/role`, dto);
  },

  removeFromQueue: async (sessionId: string, queueItemId: string): Promise<void> => {
    await apiClient.post(`/listening-sessions/${sessionId}/queue/${queueItemId}/remove`);
  },

  updateSettings: async (sessionId: string, settings: { guestsCanControl?: boolean }): Promise<void> => {
    await apiClient.patch(`/listening-sessions/${sessionId}/settings`, settings);
  },

  inviteFriend: async (sessionId: string, friendId: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post(`/listening-sessions/${sessionId}/invite/${friendId}`);
    return data;
  },

  leaveSession: async (sessionId: string): Promise<void> => {
    await apiClient.post(`/listening-sessions/${sessionId}/leave`);
  },

  endSession: async (sessionId: string): Promise<void> => {
    await apiClient.post(`/listening-sessions/${sessionId}/end`);
  },

  // Obtener recomendaciones basadas en top tracks de los participantes
  getSessionRecommendations: async (sessionId: string): Promise<{ id: string; title: string; artistName?: string; albumId?: string; duration?: number }[]> => {
    // Obtener sesion con participantes
    const session = await apiClient.get<ListeningSession>(`/listening-sessions/${sessionId}`);
    const participantIds = session.data.participants?.map((p) => p.userId) ?? [];

    // Obtener top tracks de cada participante y mezclar
    const allTracks: { id: string; title: string; artistName?: string; albumId?: string; duration?: number }[] = [];
    const seenIds = new Set<string>();

    // Obtener top tracks de cada participante (solo IDs)
    const trackIds: string[] = [];
    for (const uid of participantIds.slice(0, 5)) {
      try {
        const { data } = await apiClient.get('/play-tracking/top-tracks', { params: { userId: uid, limit: 8, days: 30 } });
        const items = Array.isArray(data) ? data : [];
        for (const t of items as { trackId: string }[]) {
          if (t.trackId && !seenIds.has(t.trackId)) {
            seenIds.add(t.trackId);
            trackIds.push(t.trackId);
          }
        }
      } catch { /* participante sin datos */ }
    }

    // Obtener detalles de cada track
    for (const trackId of trackIds.slice(0, 15)) {
      try {
        const { data: trackData } = await apiClient.get(`/tracks/${trackId}`);
        const t = trackData as { id: string; title: string; artistName?: string; albumId?: string; duration?: number };
        allTracks.push({ id: t.id, title: t.title, artistName: t.artistName, albumId: t.albumId, duration: t.duration });
      } catch { /* track no encontrado */ }
    }

    // Mezclar aleatoriamente
    return allTracks.sort(() => Math.random() - 0.5).slice(0, 15);
  },
};
