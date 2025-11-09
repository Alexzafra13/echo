import { useQuery } from '@tanstack/react-query';
import { albumsService } from '../services';

/**
 * Hook to fetch recently added albums
 */
export function useRecentAlbums(take?: number) {
  return useQuery({
    queryKey: ['albums', 'recent', take],
    queryFn: () => albumsService.getRecent(take),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook to fetch featured album for hero section
 */
export function useFeaturedAlbum() {
  return useQuery({
    queryKey: ['albums', 'featured'],
    queryFn: () => albumsService.getFeatured(),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook to fetch album by ID
 */
export function useAlbum(id: string) {
  return useQuery({
    queryKey: ['albums', id],
    queryFn: () => albumsService.getById(id),
    enabled: !!id, // Solo ejecutar si hay ID
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch all albums
 */
export function useAlbums(params?: { skip?: number; take?: number }) {
  return useQuery({
    queryKey: ['albums', 'all', params],
    queryFn: async () => {
      const response = await albumsService.getAll(params);
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to search albums
 */
export function useAlbumSearch(query: string) {
  return useQuery({
    queryKey: ['albums', 'search', query],
    queryFn: () => albumsService.search(query),
    enabled: query.length > 0, // Solo buscar si hay query
    staleTime: 2 * 60 * 1000, // 2 minutos para búsquedas
  });
}

/**
 * Hook to fetch tracks for a specific album
 */
export function useAlbumTracks(albumId: string) {
  return useQuery({
    queryKey: ['albums', albumId, 'tracks'],
    queryFn: () => albumsService.getAlbumTracks(albumId),
    enabled: !!albumId, // Solo ejecutar si hay albumId
    staleTime: 5 * 60 * 1000,
  });
}
