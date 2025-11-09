import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';

export interface AlbumCoverMetadata {
  albumId: string;
  cover: {
    exists: boolean;
    size?: number;
    mimeType?: string;
    lastModified?: string;
    tag?: string;
    source?: 'local' | 'external';
  };
}

/**
 * Hook to fetch album cover metadata including tag for cache busting
 *
 * @param albumId - The album UUID
 * @param enabled - Whether the query should run (default: true when albumId exists)
 * @returns Query result with album cover metadata
 *
 * @example
 * ```tsx
 * const { data: coverMeta } = useAlbumCoverMetadata(albumId);
 *
 * // Use cover with tag-based cache busting
 * const coverUrl = coverMeta?.cover.exists
 *   ? getAlbumCoverUrl(albumId, coverMeta.cover.tag)
 *   : fallbackUrl;
 * ```
 */
export function useAlbumCoverMetadata(albumId: string | undefined, enabled: boolean = true) {
  return useQuery<AlbumCoverMetadata>({
    queryKey: ['album-cover-metadata', albumId],
    queryFn: async () => {
      if (!albumId) {
        throw new Error('Album ID is required');
      }

      const response = await apiClient.get(`/images/albums/${albumId}/cover/metadata`);
      return response.data;
    },
    enabled: enabled && !!albumId,
    staleTime: 0, // Always consider stale so refetch works immediately when cover changes
    gcTime: 1000 * 60 * 60,    // 1 hour cache time
    retry: false, // Don't retry on error - if no cover exists, that's expected
  });
}

/**
 * Helper function to get album cover URL with tag-based cache busting
 *
 * @param albumId - The album UUID
 * @param tag - Optional cache tag (MD5 hash)
 * @returns URL for the album cover
 */
export function getAlbumCoverUrl(albumId: string, tag?: string): string {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
  const baseUrl = `${API_BASE_URL}/images/albums/${albumId}/cover`;

  // Add tag parameter for cache busting
  if (tag) {
    return `${baseUrl}?tag=${tag}`;
  }

  return baseUrl;
}
