import { apiClient } from '@shared/services/api';

export interface MusicVideo {
  id: string;
  trackId: string | null;
  title: string | null;
  artistName: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  codec: string | null;
  bitRate: number | null;
  size: number | null;
  suffix: string | null;
  matchMethod: string | null;
  streamUrl: string;
  thumbnailUrl: string | null;
}

export const musicVideosService = {
  async getByTrackId(trackId: string): Promise<MusicVideo | null> {
    try {
      const response = await apiClient.get(`/music-videos/by-track/${trackId}`);
      return response.data;
    } catch {
      return null;
    }
  },

  async getByArtistId(artistId: string): Promise<MusicVideo[]> {
    try {
      const response = await apiClient.get(`/music-videos/by-artist/${artistId}`);
      return response.data;
    } catch {
      return [];
    }
  },

  async getById(id: string): Promise<MusicVideo> {
    const response = await apiClient.get(`/music-videos/${id}`);
    return response.data;
  },

  async listAll(filter?: 'matched' | 'unmatched'): Promise<MusicVideo[]> {
    const response = await apiClient.get('/music-videos', {
      params: filter ? { filter } : undefined,
    });
    return response.data;
  },

  async linkVideo(videoId: string, trackId: string): Promise<void> {
    await apiClient.put(`/music-videos/${videoId}/link`, { trackId });
  },

  async unlinkVideo(videoId: string): Promise<void> {
    await apiClient.delete(`/music-videos/${videoId}/link`);
  },

  async getVideoMapByTrackIds(trackIds: string[]): Promise<Map<string, string>> {
    if (trackIds.length === 0) return new Map();
    try {
      const videos = await this.listAll('matched');
      const map = new Map<string, string>();
      for (const v of videos) {
        if (v.trackId && trackIds.includes(v.trackId)) {
          map.set(v.trackId, v.id);
        }
      }
      return map;
    } catch {
      return new Map();
    }
  },

  getStreamUrl(videoId: string, token: string): string {
    return `/api/music-videos/${videoId}/stream?token=${token}`;
  },
};
