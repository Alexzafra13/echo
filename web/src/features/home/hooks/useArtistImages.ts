import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';

/**
 * Artist images metadata from API (V2 with tag and source)
 */
export interface ArtistImages {
  artistId: string;
  images: {
    profile?: ImageMetadata;      // Unified profile image (replaces small/medium/large)
    background?: ImageMetadata;
    banner?: ImageMetadata;
    logo?: ImageMetadata;
  };
}

interface ImageMetadata {
  exists: boolean;
  size?: number;
  mimeType?: string;
  lastModified?: string;
  tag?: string;                   // MD5 hash for cache-busting
  source?: 'local' | 'external';  // Image source
}

/**
 * Get artist images URL from artist ID and image type (V2 with tag-based cache)
 * @param artistId - The artist ID
 * @param imageType - Type of image (profile, background, banner, logo)
 * @param tag - Optional MD5 tag for cache validation (from ImageMetadata)
 */
export function getArtistImageUrl(artistId: string, imageType: string, tag?: string): string {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
  const baseUrl = `${API_BASE_URL}/images/artists/${artistId}/${imageType}`;

  // Add tag parameter for cache validation (server returns 304 if tag matches)
  if (tag) {
    return `${baseUrl}?tag=${tag}`;
  }

  // Fallback: check for manual refresh parameter in URL
  if (new URLSearchParams(window.location.search).has('_refresh')) {
    const timestamp = new URLSearchParams(window.location.search).get('_refresh') || Date.now().toString();
    return `${baseUrl}?_t=${timestamp}`;
  }

  return baseUrl;
}

/**
 * Hook to fetch all available images for an artist
 *
 * @param artistId - The artist UUID
 * @param enabled - Whether the query should run (default: true when artistId exists)
 * @returns Query result with artist images metadata
 *
 * @example
 * ```tsx
 * const { data: artistImages } = useArtistImages(album.artistId);
 *
 * // Use images with fallback
 * const backgroundUrl = artistImages?.images.background?.exists
 *   ? getArtistImageUrl(artistId, 'background')
 *   : fallbackUrl;
 * ```
 */
export function useArtistImages(artistId: string | undefined, enabled: boolean = true) {
  return useQuery<ArtistImages>({
    queryKey: ['artist-images', artistId],
    queryFn: async () => {
      if (!artistId) {
        throw new Error('Artist ID is required');
      }

      const response = await apiClient.get(`/images/artists/${artistId}/all`);
      return response.data;
    },
    enabled: enabled && !!artistId,
    staleTime: 1000 * 60 * 30, // 30 minutes - images don't change often
    gcTime: 1000 * 60 * 60,    // 1 hour cache time
    retry: false, // Don't retry on error - if no images exist, that's expected
  });
}
