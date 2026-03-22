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

  leaveSession: async (sessionId: string): Promise<void> => {
    await apiClient.post(`/listening-sessions/${sessionId}/leave`);
  },

  endSession: async (sessionId: string): Promise<void> => {
    await apiClient.post(`/listening-sessions/${sessionId}/end`);
  },
};
