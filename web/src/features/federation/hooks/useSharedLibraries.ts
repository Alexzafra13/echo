import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { federationService, type SharedAlbumsParams } from '../services/federation.service';

/**
 * Hook to fetch connected servers
 */
export function useConnectedServers() {
  return useQuery({
    queryKey: ['federation', 'servers'],
    queryFn: () => federationService.getConnectedServers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch shared albums from connected servers
 */
export function useSharedAlbums(params: SharedAlbumsParams = {}) {
  return useQuery({
    queryKey: ['federation', 'shared-albums', params],
    queryFn: () => federationService.getSharedAlbums(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: true,
  });
}

/**
 * Hook to fetch shared albums for home page (limited count)
 */
export function useSharedAlbumsForHome(limit = 20) {
  return useQuery({
    queryKey: ['federation', 'shared-albums', 'home', limit],
    queryFn: () => federationService.getSharedAlbums({ limit }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch user's imports
 */
export function useImports() {
  return useQuery({
    queryKey: ['federation', 'imports'],
    queryFn: () => federationService.getImports(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to start an album import
 */
export function useStartImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serverId, remoteAlbumId }: { serverId: string; remoteAlbumId: string }) =>
      federationService.startImport(serverId, remoteAlbumId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['federation', 'imports'] });
    },
  });
}

/**
 * Hook to cancel an import
 */
export function useCancelImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (importId: string) => federationService.cancelImport(importId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['federation', 'imports'] });
    },
  });
}
