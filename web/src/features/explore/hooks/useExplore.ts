import { useQuery } from '@tanstack/react-query';
import { exploreService } from '../services/explore.service';

/**
 * Hook to fetch unplayed albums
 */
export function useUnplayedAlbums(limit: number = 12, offset: number = 0) {
  return useQuery({
    queryKey: ['explore', 'unplayed', limit, offset],
    queryFn: () => exploreService.getUnplayedAlbums(limit, offset),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch forgotten albums
 */
export function useForgottenAlbums(
  limit: number = 12,
  offset: number = 0,
  monthsAgo: number = 3,
) {
  return useQuery({
    queryKey: ['explore', 'forgotten', limit, offset, monthsAgo],
    queryFn: () => exploreService.getForgottenAlbums(limit, offset, monthsAgo),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch hidden gems
 */
export function useHiddenGems(limit: number = 30) {
  return useQuery({
    queryKey: ['explore', 'hidden-gems', limit],
    queryFn: () => exploreService.getHiddenGems(limit),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch random albums for surprise section
 * Non-blocking: won't retry on failure to avoid blocking page load
 */
export function useRandomAlbums(count: number = 6) {
  return useQuery({
    queryKey: ['explore', 'random-albums', count],
    queryFn: () => exploreService.getRandomAlbums(count),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false, // Don't retry - optional feature
    placeholderData: { albums: [] }, // Show empty while loading
  });
}
