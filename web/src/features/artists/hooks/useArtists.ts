import { useQuery } from '@tanstack/react-query';
import { artistsService } from '../services/artists.service';

/**
 * Hook to fetch all artists (sorted alphabetically)
 */
export function useArtists(params?: { skip?: number; take?: number }) {
  return useQuery({
    queryKey: ['artists', 'all', params],
    queryFn: () => artistsService.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch artist detail by ID
 */
export function useArtist(id: string | undefined) {
  return useQuery({
    queryKey: ['artists', id],
    queryFn: () => artistsService.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to search artists by name
 */
export function useArtistSearch(query: string, params?: { skip?: number; take?: number }) {
  return useQuery({
    queryKey: ['artists', 'search', query, params],
    queryFn: () => artistsService.search(query, params),
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch albums by artist ID
 */
export function useArtistAlbums(artistId: string | undefined, params?: { skip?: number; take?: number }) {
  return useQuery({
    queryKey: ['artists', artistId, 'albums', params],
    queryFn: () => artistsService.getAlbums(artistId!, params),
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch global statistics for an artist
 */
export function useArtistStats(artistId: string | undefined) {
  return useQuery({
    queryKey: ['artists', artistId, 'stats'],
    queryFn: () => artistsService.getStats(artistId!),
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch top tracks for an artist (most played across all users)
 */
export function useArtistTopTracks(
  artistId: string | undefined,
  limit: number = 10,
  days?: number,
) {
  return useQuery({
    queryKey: ['artists', artistId, 'top-tracks', limit, days],
    queryFn: () => artistsService.getTopTracks(artistId!, limit, days),
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch related artists based on listening patterns
 */
export function useRelatedArtists(artistId: string | undefined, limit: number = 10) {
  return useQuery({
    queryKey: ['artists', artistId, 'related', limit],
    queryFn: () => artistsService.getRelatedArtists(artistId!, limit),
    enabled: !!artistId,
    staleTime: 10 * 60 * 1000, // 10 minutes - relationships change slowly
  });
}
