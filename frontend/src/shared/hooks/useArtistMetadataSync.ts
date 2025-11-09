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
    if (!socket) {
      console.log('[useArtistMetadataSync] No socket available, skipping sync setup');
      return;
    }

    console.log('[useArtistMetadataSync] Setting up sync for artistId:', artistId);

    const handleArtistImagesUpdated = (data: ArtistImagesUpdatedEvent) => {
      console.log('[useArtistMetadataSync] 🔥 Artist images updated event received:', data);

      // If we're listening for a specific artist, ignore updates for other artists
      if (artistId && data.artistId !== artistId) {
        return;
      }

      // FORCE IMMEDIATE REFETCH (not just invalidate) to ensure UI updates
      // This is critical because invalidateQueries only marks as stale,
      // but doesn't guarantee immediate refetch
      queryClient.refetchQueries({
        queryKey: ['artists', data.artistId],
        type: 'active'
      });

      // Refetch artist images metadata
      queryClient.refetchQueries({
        queryKey: ['artist-images', data.artistId],
        type: 'active'
      });

      // If no specific artist ID, also refetch the artists list
      if (!artistId) {
        queryClient.refetchQueries({
          queryKey: ['artists'],
          type: 'active'
        });
      }

      console.log(`[useArtistMetadataSync] ✅ Forced immediate refetch for artist ${data.artistId}`);
    };

    // Subscribe to artist images updated events
    socket.on('artist:images:updated', handleArtistImagesUpdated);
    console.log('[useArtistMetadataSync] ✅ Subscribed to artist:images:updated events');

    // Cleanup
    return () => {
      socket.off('artist:images:updated', handleArtistImagesUpdated);
      console.log('[useArtistMetadataSync] ❌ Unsubscribed from artist:images:updated events');
    };
  }, [socket, queryClient, artistId]);
}
