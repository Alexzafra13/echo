import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';

/**
 * Hook to automatically enrich an artist if they don't have external metadata
 * This runs once per artist when the HeroSection loads
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
      console.log('[useAutoEnrichArtist] Starting enrichment for artist:', id);
      const response = await apiClient.post(`/metadata/artists/${id}/enrich?forceRefresh=false`);
      console.log('[useAutoEnrichArtist] Enrichment result:', response.data);
      return response.data;
    },
    onSuccess: (data, artistId) => {
      console.log('[useAutoEnrichArtist] Successfully enriched artist:', artistId, data);
    },
    onError: (error: any, artistId) => {
      // Don't show error if artist not found or API key not configured - this is expected
      if (error.response?.status !== 404 && error.response?.status !== 400) {
        console.error('[useAutoEnrichArtist] Error enriching artist:', artistId, error);
      } else {
        console.log('[useAutoEnrichArtist] Enrichment not available for artist:', artistId);
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
      console.log('[useAutoEnrichArtist] Artist already has images, skipping enrichment');
      return;
    }

    // Don't enrich if we've already tried this artist
    if (enrichedArtists.current.has(artistId)) {
      console.log('[useAutoEnrichArtist] Already tried enriching this artist, skipping');
      return;
    }

    // Mark as enriched and trigger enrichment
    console.log('[useAutoEnrichArtist] Artist has no images, triggering enrichment...');
    enrichedArtists.current.add(artistId);
    enrichMutation.mutate(artistId);
  }, [artistId, hasImages, enabled]);

  return {
    isEnriching: enrichMutation.isPending,
    enrichmentResult: enrichMutation.data,
  };
}
