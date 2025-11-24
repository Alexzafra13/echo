import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMetadataWebSocket, AlbumCoverUpdatedEvent } from './useMetadataWebSocket';

/**
 * useAlbumMetadataSync
 *
 * Automatically synchronizes album metadata when updates occur via WebSocket.
 * Listens to `album:cover:updated` events and invalidates relevant React Query caches.
 *
 * This hook should be used in:
 * - AlbumPage/AlbumDetailPage
 * - HomePage (album grids)
 * - ArtistDetailPage (artist's albums)
 * - HeroSection (if showing album)
 *
 * @param albumId - Optional album ID to listen for specific album updates only
 * @param artistId - Optional artist ID to also invalidate artist queries (albums affect artist pages)
 *
 * @example
 * ```tsx
 * function AlbumPage({ albumId }: { albumId: string }) {
 *   const { data: album } = useAlbum(albumId);
 *
 *   // Auto-sync this specific album
 *   useAlbumMetadataSync(albumId, album?.artistId);
 *
 *   // ...
 * }
 * ```
 *
 * @example
 * ```tsx
 * function HomePage() {
 *   // Auto-sync all albums
 *   useAlbumMetadataSync();
 *
 *   const { data: albums } = useAlbums();
 *   // ...
 * }
 * ```
 */
export function useAlbumMetadataSync(albumId?: string, artistId?: string) {
  const queryClient = useQueryClient();
  const socket = useMetadataWebSocket();

  useEffect(() => {
    if (!socket) return;

    const handleAlbumCoverUpdated = (data: AlbumCoverUpdatedEvent) => {
      // If we're listening for a specific album, ignore updates for other albums
      if (albumId && data.albumId !== albumId) {
        return;
      }

      // FORCE IMMEDIATE REFETCH (not just invalidate) to ensure UI updates
      // This is critical because invalidateQueries only marks as stale,
      // but doesn't guarantee immediate refetch
      queryClient.refetchQueries({
        queryKey: ['albums', data.albumId],
        type: 'active'
      });

      // CRITICAL: Refetch album cover metadata to get new tag for cache busting
      queryClient.refetchQueries({
        queryKey: ['album-cover-metadata', data.albumId],
        type: 'active'
      });

      // If no specific album ID, refetch the albums list
      if (!albumId) {
        queryClient.refetchQueries({
          queryKey: ['albums'],
          type: 'active'
        });
      }

      // Also refetch artist queries (album covers appear on artist pages)
      if (data.artistId) {
        queryClient.refetchQueries({
          queryKey: ['artists', data.artistId],
          type: 'active'
        });
      }

      // If we have a specific artistId param, also refetch it
      if (artistId) {
        queryClient.refetchQueries({
          queryKey: ['artists', artistId],
          type: 'active'
        });
      }
    };

    // Subscribe to album cover updated events
    socket.on('album:cover:updated', handleAlbumCoverUpdated);

    // Cleanup
    return () => {
      socket.off('album:cover:updated', handleAlbumCoverUpdated);
    };
  }, [socket, queryClient, albumId, artistId]);
}
