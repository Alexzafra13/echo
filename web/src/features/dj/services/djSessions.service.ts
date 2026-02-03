import { apiClient } from '@shared/services/api';

export interface DjSessionTrack {
  trackId: string;
  order: number;
  bpm?: number;
  camelotKey?: string;
  energy?: number;
  compatibilityScore?: number;
  title?: string;
  artist?: string;
  albumId?: string;
  duration?: number;
}

export interface DjSession {
  id: string;
  name: string;
  trackCount: number;
  transitionType: string;
  transitionDuration: number;
  tracks: DjSessionTrack[];
  totalDuration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DjSessionListResponse {
  sessions: DjSession[];
  total: number;
}

export interface CreateDjSessionDto {
  name: string;
  trackIds: string[];
  transitionType?: 'crossfade' | 'mashup' | 'cut';
  transitionDuration?: number;
  processStems?: boolean;
}

export interface UpdateDjSessionDto {
  name?: string;
  trackIds?: string[];
  transitionType?: 'crossfade' | 'mashup' | 'cut';
  transitionDuration?: number;
}

class DjSessionsService {
  async getSessions(): Promise<DjSessionListResponse> {
    const response = await apiClient.get('/dj/sessions');
    return response.data;
  }

  async getSession(id: string): Promise<DjSession> {
    const response = await apiClient.get(`/dj/sessions/${id}`);
    return response.data;
  }

  async createSession(dto: CreateDjSessionDto): Promise<DjSession> {
    const response = await apiClient.post('/dj/sessions', dto);
    return response.data;
  }

  async updateSession(id: string, dto: UpdateDjSessionDto): Promise<DjSession> {
    const response = await apiClient.put(`/dj/sessions/${id}`, dto);
    return response.data;
  }

  async deleteSession(id: string): Promise<void> {
    await apiClient.delete(`/dj/sessions/${id}`);
  }

  async addTrackToSession(sessionId: string, trackId: string): Promise<DjSession> {
    const response = await apiClient.post(`/dj/sessions/${sessionId}/tracks`, { trackId });
    return response.data;
  }

  async removeTrackFromSession(sessionId: string, trackId: string): Promise<DjSession> {
    const response = await apiClient.delete(`/dj/sessions/${sessionId}/tracks/${trackId}`);
    return response.data;
  }
}

export const djSessionsService = new DjSessionsService();
