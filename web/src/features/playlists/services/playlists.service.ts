import { apiClient } from '@shared/services/api';
import type {
  Playlist,
  PlaylistTrack,
  PlaylistCollaborator,
  CreatePlaylistDto,
  UpdatePlaylistDto,
  AddTrackToPlaylistDto,
  ReorderTracksDto,
  InviteCollaboratorDto,
  UpdateCollaboratorRoleDto,
} from '../types';

export const playlistsService = {
  getPlaylists: async (params?: {
    skip?: number;
    take?: number;
    publicOnly?: boolean;
    search?: string;
  }): Promise<{
    items: Playlist[];
    total: number;
    skip: number;
    take: number;
  }> => {
    const { data } = await apiClient.get<{
      items: Playlist[];
      total: number;
      skip: number;
      take: number;
    }>('/playlists', { params });
    return data;
  },

  getPlaylist: async (id: string): Promise<Playlist> => {
    const { data } = await apiClient.get<Playlist>(`/playlists/${id}`);
    return data;
  },

  createPlaylist: async (dto: CreatePlaylistDto): Promise<Playlist> => {
    const { data } = await apiClient.post<Playlist>('/playlists', dto);
    return data;
  },

  updatePlaylist: async (id: string, dto: UpdatePlaylistDto): Promise<Playlist> => {
    const { data } = await apiClient.patch<Playlist>(`/playlists/${id}`, dto);
    return data;
  },

  deletePlaylist: async (id: string): Promise<void> => {
    await apiClient.delete(`/playlists/${id}`);
  },

  getPlaylistTracks: async (
    id: string
  ): Promise<{
    playlistId: string;
    playlistName: string;
    tracks: PlaylistTrack[];
    total: number;
  }> => {
    const { data } = await apiClient.get<{
      playlistId: string;
      playlistName: string;
      tracks: PlaylistTrack[];
      total: number;
    }>(`/playlists/${id}/tracks`);
    return data;
  },

  addTrackToPlaylist: async (
    playlistId: string,
    dto: AddTrackToPlaylistDto
  ): Promise<PlaylistTrack> => {
    const { data } = await apiClient.post<PlaylistTrack>(`/playlists/${playlistId}/tracks`, dto);
    return data;
  },

  removeTrackFromPlaylist: async (playlistId: string, trackId: string): Promise<void> => {
    await apiClient.delete(`/playlists/${playlistId}/tracks/${trackId}`);
  },

  reorderTracks: async (playlistId: string, dto: ReorderTracksDto): Promise<void> => {
    await apiClient.post(`/playlists/${playlistId}/tracks/reorder`, dto);
  },

  /**
   * Shuffle con ordenación harmónica DJ-aware.
   * Fallback a shuffle aleatorio si no hay suficientes datos de análisis DJ.
   */
  getDjShuffledTracks: async (
    id: string,
    params?: {
      seed?: number;
    }
  ): Promise<{
    playlistId: string;
    playlistName: string;
    tracks: PlaylistTrack[];
    total: number;
    seed: number;
    djMode: boolean;
  }> => {
    const { data } = await apiClient.get<{
      playlistId: string;
      playlistName: string;
      tracks: PlaylistTrack[];
      total: number;
      seed: number;
      djMode: boolean;
    }>(`/playlists/${id}/tracks/shuffle/dj`, { params });
    return data;
  },

  getPlaylistsByArtist: async (
    artistId: string,
    params?: {
      skip?: number;
      take?: number;
    }
  ): Promise<{
    items: Playlist[];
    total: number;
    skip: number;
    take: number;
  }> => {
    const { data } = await apiClient.get<{
      items: Playlist[];
      total: number;
      skip: number;
      take: number;
    }>(`/playlists/by-artist/${artistId}`, { params });
    return data;
  },

  // ============================================
  // Collaboration
  // ============================================

  getCollaborators: async (
    playlistId: string
  ): Promise<{
    playlistId: string;
    collaborators: PlaylistCollaborator[];
  }> => {
    const { data } = await apiClient.get<{
      playlistId: string;
      collaborators: PlaylistCollaborator[];
    }>(`/playlists/${playlistId}/collaborators`);
    return data;
  },

  inviteCollaborator: async (
    playlistId: string,
    dto: InviteCollaboratorDto
  ): Promise<PlaylistCollaborator> => {
    const { data } = await apiClient.post<PlaylistCollaborator>(
      `/playlists/${playlistId}/collaborators`,
      dto
    );
    return data;
  },

  acceptCollaboration: async (collaborationId: string): Promise<void> => {
    await apiClient.post(`/playlists/collaborations/${collaborationId}/accept`);
  },

  updateCollaboratorRole: async (
    playlistId: string,
    userId: string,
    dto: UpdateCollaboratorRoleDto
  ): Promise<void> => {
    await apiClient.patch(`/playlists/${playlistId}/collaborators/${userId}/role`, dto);
  },

  removeCollaborator: async (playlistId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/playlists/${playlistId}/collaborators/${userId}`);
  },
};
