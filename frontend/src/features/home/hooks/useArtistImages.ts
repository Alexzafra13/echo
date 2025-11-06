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
 */
export function getArtistImageUrl(artistId: string, imageType: string): string {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
  return `${API_BASE_URL}/images/artists/${artistId}/${imageType}`;
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
  });
}
