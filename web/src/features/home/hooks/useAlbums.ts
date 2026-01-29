import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { albumsService } from '../services';

/**
 * Hook to fetch recently added albums
 */
export function useRecentAlbums(take?: number) {
  return useQuery({
    queryKey: ['albums', 'recent', take],
    queryFn: () => albumsService.getRecent(take),
    staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer for fast navigation
  });
}

/**
 * Hook to fetch top played albums based on play statistics
 */
export function useTopPlayedAlbums(take?: number) {
  return useQuery({
    queryKey: ['albums', 'top-played', take],
    queryFn: () => albumsService.getTopPlayed(take),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch featured album for hero section
 */
export function useFeaturedAlbum() {
  return useQuery({
    queryKey: ['albums', 'featured'],
    queryFn: () => albumsService.getFeatured(),
    staleTime: 10 * 60 * 1000, // 10 minutes - featured changes less frequently
    gcTime: 60 * 60 * 1000, // 1 hour
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
    enabled: query.length > 0, // Only search if query exists
    staleTime: 2 * 60 * 1000, // 2 minutes for searches
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: keepPreviousData, // Show previous results while fetching new ones
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

/**
 * Hook to fetch albums sorted alphabetically (A-Z)
 */
export function useAlbumsAlphabetically(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['albums', 'alphabetical', params],
    queryFn: () => albumsService.getAlphabetically(params),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook to fetch albums sorted by artist name
 */
export function useAlbumsByArtist(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['albums', 'by-artist', params],
    queryFn: () => albumsService.getByArtist(params),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook to fetch recently played albums for the authenticated user
 */
export function useAlbumsRecentlyPlayed(limit?: number) {
  return useQuery({
    queryKey: ['albums', 'recently-played', limit],
    queryFn: () => albumsService.getRecentlyPlayed(limit),
    staleTime: 2 * 60 * 1000, // 2 minutos (más dinámico)
  });
}

/**
 * Hook to fetch favorite albums for the authenticated user
 */
export function useAlbumsFavorites(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['albums', 'favorites', params],
    queryFn: () => albumsService.getFavorites(params),
    staleTime: 2 * 60 * 1000, // 2 minutos (más dinámico)
  });
}
