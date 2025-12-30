import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';
import { logger } from '@shared/utils/logger';

/**
 * Hook to automatically enrich an artist if they don't have external metadata
 * This runs once per artist when the HeroSection loads
 *
 * Automatically downloads Fanart.tv images (backgrounds, banners, logos) when missing
 *
 * @param artistId - The artist UUID
 * @param hasImages - Whether the artist already has images from Fanart.tv
 * @param enabled - Whether auto-enrichment should run
 *
 * @example
 * ```tsx
 * const { data: artistImages } = useArtistImages(album.artistId);
 * const hasAnyImages = artistImages?.images.background?.exists || artistImages?.images.logo?.exists;
 *
 * // Auto-enrich if no images exist
 * useAutoEnrichArtist(album.artistId, hasAnyImages);
 * ```
 */
export function useAutoEnrichArtist(
  artistId: string | undefined,
  hasImages: boolean | undefined,
  enabled: boolean = true
) {
  // Track which artists we've already tried to enrich (to avoid duplicates)
  const enrichedArtists = useRef<Set<string>>(new Set());

  const enrichMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/metadata/artists/${id}/enrich?forceRefresh=false`);
      return response.data;
    },
    onError: (error: any) => {
      // Only log unexpected errors (not 404/400 which are expected when enrichment is unavailable)
      if (import.meta.env.DEV && error.response?.status !== 404 && error.response?.status !== 400) {
        logger.error('[useAutoEnrichArtist] Unexpected error:', error);
      }
    },
  });

  useEffect(() => {
    // Only run if enabled and we have all required data
    if (!enabled || !artistId || hasImages === undefined) {
      return;
    }

    // Don't enrich if already has images
    if (hasImages) {
      return;
    }

    // Don't enrich if we've already tried this artist
    if (enrichedArtists.current.has(artistId)) {
      return;
    }

    // Mark as enriched and trigger enrichment
    enrichedArtists.current.add(artistId);
    enrichMutation.mutate(artistId);
  }, [artistId, hasImages, enabled]);

  return {
    isEnriching: enrichMutation.isPending,
    enrichmentResult: enrichMutation.data,
  };
}
