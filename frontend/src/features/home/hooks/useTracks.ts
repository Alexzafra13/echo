import { useQuery} from '@tanstack/react-query';
import { tracksService } from '../services';

/**
 * Hook to search tracks
 */
export function useTrackSearch(query: string, params?: { skip?: number; take?: number }) {
  return useQuery({
    queryKey: ['tracks', 'search', query, params],
    queryFn: () => tracksService.search(query, params),
    enabled: query.length >= 2, // Solo buscar si hay al menos 2 caracteres
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
