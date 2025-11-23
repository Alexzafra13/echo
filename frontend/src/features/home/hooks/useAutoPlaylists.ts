import { useQuery } from '@tanstack/react-query';
import { getAutoPlaylists, type AutoPlaylist } from '@shared/services/recommendations.service';

/**
 * Hook to fetch auto-generated playlists (Wave Mix + Artist playlists + Genre playlists)
 * Cached for 5 minutes on the client side (backend has 24h Redis cache)
 */
export function useAutoPlaylists() {
  return useQuery({
    queryKey: ['recommendations', 'auto-playlists'],
    queryFn: () => getAutoPlaylists(),
    staleTime: 5 * 60 * 1000, // 5 minutes - client-side cache
    // Backend already has 24h Redis cache, so this is just to avoid re-fetching on component remounts
  });
}

/**
 * Helper to separate playlists by type
 */
export function categorizeAutoPlaylists(playlists: AutoPlaylist[]) {
  return {
    waveMix: playlists.find(p => p.type === 'wave-mix'),
    artistPlaylists: playlists.filter(p => p.type === 'artist'),
    genrePlaylists: playlists.filter(p => p.type === 'genre'),
  };
}

/**
 * Helper to randomly select N items from an array
 */
export function randomSelect<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;

  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
