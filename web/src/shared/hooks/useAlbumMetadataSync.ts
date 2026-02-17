import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMetadataSSE, AlbumCoverUpdatedEvent } from './useMetadataSSE';

// Sincroniza metadatos de álbum via SSE e invalida caches de React Query
export function useAlbumMetadataSync(albumId?: string, artistId?: string) {
  const queryClient = useQueryClient();
  const eventSource = useMetadataSSE();

  useEffect(() => {
    if (!eventSource) return;

    const handleAlbumCoverUpdated = (e: MessageEvent) => {
      const data: AlbumCoverUpdatedEvent = JSON.parse(e.data);

      if (albumId && data.albumId !== albumId) return;

      queryClient.refetchQueries({
        queryKey: ['albums', data.albumId],
        type: 'active',
      });

      queryClient.refetchQueries({
        queryKey: ['album-cover-metadata', data.albumId],
        type: 'active',
      });

      if (!albumId) {
        queryClient.refetchQueries({
          queryKey: ['albums'],
          type: 'active',
        });
      }

      if (data.artistId) {
        queryClient.refetchQueries({
          queryKey: ['artists', data.artistId],
          type: 'active',
        });
      }

      if (artistId) {
        queryClient.refetchQueries({
          queryKey: ['artists', artistId],
          type: 'active',
        });
      }
    };

    eventSource.addEventListener('album:cover:updated', handleAlbumCoverUpdated);

    return () => {
      eventSource.removeEventListener('album:cover:updated', handleAlbumCoverUpdated);
    };
  }, [eventSource, queryClient, albumId, artistId]);
}
