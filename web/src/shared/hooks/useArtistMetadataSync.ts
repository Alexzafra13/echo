import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMetadataSSE, ArtistImagesUpdatedEvent } from './useMetadataSSE';

/**
 * useArtistMetadataSync
 *
 * Automatically synchronizes artist metadata when updates occur via SSE.
 * Listens to `artist:images:updated` events and invalidates relevant React Query caches.
 *
 * @param artistId - Optional artist ID to listen for specific artist updates only
 */
export function useArtistMetadataSync(artistId?: string) {
  const queryClient = useQueryClient();
  const eventSource = useMetadataSSE();

  useEffect(() => {
    if (!eventSource) return;

    const handleArtistImagesUpdated = (e: MessageEvent) => {
      const data: ArtistImagesUpdatedEvent = JSON.parse(e.data);
      if (artistId && data.artistId !== artistId) return;

      queryClient.refetchQueries({
        queryKey: ['artists', data.artistId],
        type: 'active',
      });

      queryClient.refetchQueries({
        queryKey: ['artist-images', data.artistId],
        type: 'active',
      });

      if (!artistId) {
        queryClient.refetchQueries({
          queryKey: ['artists'],
          type: 'active',
        });
      }
    };

    eventSource.addEventListener('artist:images:updated', handleArtistImagesUpdated);

    return () => {
      eventSource.removeEventListener('artist:images:updated', handleArtistImagesUpdated);
    };
  }, [eventSource, queryClient, artistId]);
}
