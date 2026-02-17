import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playlistsService } from '../services/playlists.service';
import type {
  CreatePlaylistDto,
  UpdatePlaylistDto,
  AddTrackToPlaylistDto,
  ReorderTracksDto,
} from '../types';

export function usePlaylists(params?: {
  skip?: number;
  take?: number;
  publicOnly?: boolean;
}) {
  return useQuery({
    queryKey: ['playlists', params],
    queryFn: () => playlistsService.getPlaylists(params),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function usePlaylist(id: string) {
  return useQuery({
    queryKey: ['playlists', id],
    queryFn: () => playlistsService.getPlaylist(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function usePlaylistTracks(playlistId: string) {
  return useQuery({
    queryKey: ['playlists', playlistId, 'tracks'],
    queryFn: () => playlistsService.getPlaylistTracks(playlistId),
    enabled: !!playlistId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreatePlaylistDto) => playlistsService.createPlaylist(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

export function useUpdatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePlaylistDto }) =>
      playlistsService.updatePlaylist(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlists', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => playlistsService.deletePlaylist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

export function useAddTrackToPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, dto }: { playlistId: string; dto: AddTrackToPlaylistDto }) =>
      playlistsService.addTrackToPlaylist(playlistId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['playlists', variables.playlistId, 'tracks'],
      });
      queryClient.invalidateQueries({ queryKey: ['playlists', variables.playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

export function useRemoveTrackFromPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, trackId }: { playlistId: string; trackId: string }) =>
      playlistsService.removeTrackFromPlaylist(playlistId, trackId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['playlists', variables.playlistId, 'tracks'],
      });
      queryClient.invalidateQueries({ queryKey: ['playlists', variables.playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

export function useReorderPlaylistTracks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, dto }: { playlistId: string; dto: ReorderTracksDto }) =>
      playlistsService.reorderTracks(playlistId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['playlists', variables.playlistId, 'tracks'],
      });
    },
  });
}

export function usePlaylistsByArtist(artistId: string | undefined, params?: {
  skip?: number;
  take?: number;
}) {
  return useQuery({
    queryKey: ['playlists', 'by-artist', artistId, params],
    queryFn: () => playlistsService.getPlaylistsByArtist(artistId!, params),
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000,
  });
}
