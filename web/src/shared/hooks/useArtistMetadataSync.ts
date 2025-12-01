import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMetadataWebSocket, ArtistImagesUpdatedEvent } from './useMetadataWebSocket';

/**
 * useArtistMetadataSync
 *
 * Automatically synchronizes artist metadata when updates occur via WebSocket.
 * Listens to `artist:images:updated` events and invalidates relevant React Query caches.
 *
 * This hook should be used in:
 * - ArtistDetailPage
 * - ArtistsPage (list view)
 * - HeroSection (if showing artist)
 * - Any component displaying artist images
 *
 * @param artistId - Optional artist ID to listen for specific artist updates only
 *
 * @example
 * ```tsx
 * function ArtistDetailPage({ artistId }: { artistId: string }) {
 *   // Auto-sync this specific artist
 *   useArtistMetadataSync(artistId);
 *
 *   const { data: artist } = useArtist(artistId);
 *   // ...
 * }
 * ```
 *
 * @example
 * ```tsx
 * function ArtistsPage() {
 *   // Auto-sync all artists
 *   useArtistMetadataSync();
 *
 *   const { data: artists } = useArtists();
 *   // ...
 * }
 * ```
 */
export function useArtistMetadataSync(artistId?: string) {
  const queryClient = useQueryClient();
  const socket = useMetadataWebSocket();

  useEffect(() => {
    if (!socket) return;

    const handleArtistImagesUpdated = (data: ArtistImagesUpdatedEvent) => {
      if (artistId && data.artistId !== artistId) return;

      queryClient.refetchQueries({
        queryKey: ['artists', data.artistId],
        type: 'active'
      });

      queryClient.refetchQueries({
        queryKey: ['artist-images', data.artistId],
        type: 'active'
      });

      if (!artistId) {
        queryClient.refetchQueries({
          queryKey: ['artists'],
          type: 'active'
        });
      }
    };

    socket.on('artist:images:updated', handleArtistImagesUpdated);

    return () => {
      socket.off('artist:images:updated', handleArtistImagesUpdated);
    };
  }, [socket, queryClient, artistId]);
}
