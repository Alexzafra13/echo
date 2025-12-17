import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playlistsService } from '../services/playlists.service';
import type {
  CreatePlaylistDto,
  UpdatePlaylistDto,
  AddTrackToPlaylistDto,
  ReorderTracksDto,
} from '../types';

/**
 * Hook to fetch all playlists
 */
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

/**
 * Hook to fetch a specific playlist by ID
 */
export function usePlaylist(id: string) {
  return useQuery({
    queryKey: ['playlists', id],
    queryFn: () => playlistsService.getPlaylist(id),
    enabled: !!id,
    staleTime: 0, // Always refetch to ensure metadata is up-to-date
  });
}

/**
 * Hook to fetch tracks in a playlist
 */
export function usePlaylistTracks(playlistId: string) {
  return useQuery({
    queryKey: ['playlists', playlistId, 'tracks'],
    queryFn: () => playlistsService.getPlaylistTracks(playlistId),
    enabled: !!playlistId,
    staleTime: 0, // Always refetch to ensure tracks list is up-to-date
  });
}

/**
 * Hook to create a new playlist
 */
export function useCreatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreatePlaylistDto) => playlistsService.createPlaylist(dto),
    onSuccess: () => {
      // Invalidate playlists list to refetch
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

/**
 * Hook to update a playlist
 */
export function useUpdatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePlaylistDto }) =>
      playlistsService.updatePlaylist(id, dto),
    onSuccess: (_, variables) => {
      // Invalidate specific playlist and list
      queryClient.invalidateQueries({ queryKey: ['playlists', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

/**
 * Hook to delete a playlist
 */
export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => playlistsService.deletePlaylist(id),
    onSuccess: () => {
      // Invalidate playlists list
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

/**
 * Hook to add a track to a playlist
 */
export function useAddTrackToPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, dto }: { playlistId: string; dto: AddTrackToPlaylistDto }) =>
      playlistsService.addTrackToPlaylist(playlistId, dto),
    onSuccess: (_, variables) => {
      // Invalidate playlist tracks and playlist itself (to update track count)
      queryClient.invalidateQueries({
        queryKey: ['playlists', variables.playlistId, 'tracks'],
      });
      queryClient.invalidateQueries({ queryKey: ['playlists', variables.playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

/**
 * Hook to remove a track from a playlist
 */
export function useRemoveTrackFromPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, trackId }: { playlistId: string; trackId: string }) =>
      playlistsService.removeTrackFromPlaylist(playlistId, trackId),
    onSuccess: (_, variables) => {
      // Invalidate playlist tracks and playlist itself
      queryClient.invalidateQueries({
        queryKey: ['playlists', variables.playlistId, 'tracks'],
      });
      queryClient.invalidateQueries({ queryKey: ['playlists', variables.playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

/**
 * Hook to reorder tracks in a playlist
 */
export function useReorderPlaylistTracks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, dto }: { playlistId: string; dto: ReorderTracksDto }) =>
      playlistsService.reorderTracks(playlistId, dto),
    onSuccess: (_, variables) => {
      // Invalidate playlist tracks
      queryClient.invalidateQueries({
        queryKey: ['playlists', variables.playlistId, 'tracks'],
      });
    },
  });
}

/**
 * Hook to fetch public playlists containing tracks from a specific artist
 */
export function usePlaylistsByArtist(artistId: string | undefined, params?: {
  skip?: number;
  take?: number;
}) {
  return useQuery({
    queryKey: ['playlists', 'by-artist', artistId, params],
    queryFn: () => playlistsService.getPlaylistsByArtist(artistId!, params),
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
