import { useQuery } from '@tanstack/react-query';
import { musicVideosService } from '@features/music-videos';
import type { MusicVideo } from '@features/music-videos';

/**
 * Fetches matched music videos for use in the home hero pool.
 */
export function useHomeMusicVideos() {
  return useQuery<MusicVideo[]>({
    queryKey: ['home', 'music-videos', 'matched'],
    queryFn: () => musicVideosService.listAll('matched'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
