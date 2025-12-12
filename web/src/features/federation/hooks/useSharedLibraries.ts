import { useQuery } from '@tanstack/react-query';
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
