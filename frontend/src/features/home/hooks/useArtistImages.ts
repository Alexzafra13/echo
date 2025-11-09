import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';

/**
 * Artist images metadata from API
 */
export interface ArtistImages {
  artistId: string;
  images: {
    profileSmall?: ImageMetadata;
    profileMedium?: ImageMetadata;
    profileLarge?: ImageMetadata;
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
}

/**
 * Get artist images URL from artist ID and image type
 * @param artistId - The artist ID
 * @param imageType - Type of image (background, banner, logo, profile-small, etc.)
 * @param updatedAt - Optional timestamp for cache busting (use artist.externalInfoUpdatedAt or artist.updatedAt)
 */
export function getArtistImageUrl(artistId: string, imageType: string, updatedAt?: Date): string {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
  const baseUrl = `${API_BASE_URL}/images/artists/${artistId}/${imageType}`;

  // Add version parameter using updatedAt timestamp for cache busting
  if (updatedAt) {
    const version = new Date(updatedAt).getTime();
    return `${baseUrl}?v=${version}`;
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

      console.log('[useArtistImages] Fetching images for artist:', artistId);
      const response = await apiClient.get(`/images/artists/${artistId}/all`);
      console.log('[useArtistImages] Response:', response.data);
      return response.data;
    },
    enabled: enabled && !!artistId,
    staleTime: 1000 * 60 * 30, // 30 minutes - images don't change often
    gcTime: 1000 * 60 * 60,    // 1 hour cache time
    retry: false, // Don't retry on error - if no images exist, that's expected
  });
}
