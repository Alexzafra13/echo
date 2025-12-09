import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/store/authStore';
import { logger } from '@shared/utils/logger';

/**
 * Metadata event types
 */
export type MetadataEventType =
  | 'artist:images:updated'
  | 'album:cover:updated'
  | 'metadata:cache:invalidate'
  | 'enrichment:started'
  | 'enrichment:progress'
  | 'enrichment:completed'
  | 'enrichment:error'
  | 'batch:enrichment:started'
  | 'batch:enrichment:progress'
  | 'batch:enrichment:completed'
  | 'queue:started'
  | 'queue:stopped'
  | 'queue:item:completed'
  | 'queue:item:error'
  | 'queue:completed'
  | 'connected'
  | 'keepalive';

/**
 * Artist images updated event payload
 */
export interface ArtistImagesUpdatedEvent {
  artistId: string;
  artistName: string;
  imageType: 'profile' | 'background' | 'banner' | 'logo';
  updatedAt: string;
  timestamp: string;
}

/**
 * Album cover updated event payload
 */
export interface AlbumCoverUpdatedEvent {
  albumId: string;
  albumName: string;
  artistId: string;
  updatedAt: string;
  timestamp: string;
}

/**
 * Cache invalidation event payload
 */
export interface CacheInvalidationEvent {
  entityType: 'artist' | 'album';
  entityId: string;
  reason: string;
  timestamp: string;
}

/**
 * Event handlers for metadata SSE events
 */
export interface MetadataSSEHandlers {
  onArtistImagesUpdated?: (data: ArtistImagesUpdatedEvent) => void;
  onAlbumCoverUpdated?: (data: AlbumCoverUpdatedEvent) => void;
  onCacheInvalidation?: (data: CacheInvalidationEvent) => void;
}

/**
 * useMetadataSSE
 *
 * Hook for real-time metadata updates via Server-Sent Events
 *
 * When artist images or album covers are updated, this hook receives the update
 * instantly via SSE and can trigger cache invalidation.
 *
 * This replaces the WebSocket-based useMetadataWebSocket hook with a more
 * efficient SSE implementation for unidirectional (server -> client) updates.
 *
 * @param handlers - Optional event handlers for specific events
 *
 * @example
 * ```tsx
 * // Basic usage - just connect to receive updates
 * useMetadataSSE();
 *
 * // With custom handlers
 * useMetadataSSE({
 *   onArtistImagesUpdated: (data) => console.log('Artist updated:', data),
 *   onAlbumCoverUpdated: (data) => console.log('Album updated:', data),
 * });
 * ```
 */
export function useMetadataSSE(handlers?: MetadataSSEHandlers) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const handlersRef = useRef(handlers);

  // Keep handlers ref up to date
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const connect = useCallback(() => {
    // SSE endpoint is public, but we only connect if user is authenticated
    if (!user?.id) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const url = `${apiUrl}/metadata/stream`;

      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        logger.debug('[MetadataSSE] Connected to metadata stream');
        reconnectAttemptsRef.current = 0;
      };

      // Handle artist images updated
      eventSource.addEventListener('artist:images:updated', (event: MessageEvent) => {
        try {
          const data: ArtistImagesUpdatedEvent = JSON.parse(event.data);
          logger.debug('[MetadataSSE] Artist images updated:', data);

          // Call custom handler if provided
          handlersRef.current?.onArtistImagesUpdated?.(data);

          // Invalidate artist queries
          queryClient.refetchQueries({
            queryKey: ['artists', data.artistId],
            type: 'active',
          });
          queryClient.refetchQueries({
            queryKey: ['artist-images', data.artistId],
            type: 'active',
          });
        } catch (err) {
          logger.error('[MetadataSSE] Failed to parse artist:images:updated:', err);
        }
      });

      // Handle album cover updated
      eventSource.addEventListener('album:cover:updated', (event: MessageEvent) => {
        try {
          const data: AlbumCoverUpdatedEvent = JSON.parse(event.data);
          logger.debug('[MetadataSSE] Album cover updated:', data);

          // Call custom handler if provided
          handlersRef.current?.onAlbumCoverUpdated?.(data);

          // Invalidate album queries
          queryClient.refetchQueries({
            queryKey: ['albums', data.albumId],
            type: 'active',
          });
          queryClient.refetchQueries({
            queryKey: ['album-cover-metadata', data.albumId],
            type: 'active',
          });

          // Also invalidate artist queries (album covers appear on artist pages)
          if (data.artistId) {
            queryClient.refetchQueries({
              queryKey: ['artists', data.artistId],
              type: 'active',
            });
          }
        } catch (err) {
          logger.error('[MetadataSSE] Failed to parse album:cover:updated:', err);
        }
      });

      // Handle cache invalidation
      eventSource.addEventListener('metadata:cache:invalidate', (event: MessageEvent) => {
        try {
          const data: CacheInvalidationEvent = JSON.parse(event.data);
          logger.debug('[MetadataSSE] Cache invalidation:', data);

          // Call custom handler if provided
          handlersRef.current?.onCacheInvalidation?.(data);

          // Invalidate the appropriate queries based on entity type
          if (data.entityType === 'artist') {
            queryClient.refetchQueries({
              queryKey: ['artists', data.entityId],
              type: 'active',
            });
          } else if (data.entityType === 'album') {
            queryClient.refetchQueries({
              queryKey: ['albums', data.entityId],
              type: 'active',
            });
          }
        } catch (err) {
          logger.error('[MetadataSSE] Failed to parse metadata:cache:invalidate:', err);
        }
      });

      // Handle connection established
      eventSource.addEventListener('connected', (event: MessageEvent) => {
        logger.debug('[MetadataSSE] Metadata stream connected:', event.data);
      });

      // Handle keepalive
      eventSource.addEventListener('keepalive', () => {
        // Keepalive received - connection is healthy
      });

      // Handle connection errors
      eventSource.onerror = (err) => {
        logger.error('[MetadataSSE] Connection error:', err);
        eventSource.close();

        // Exponential backoff for reconnection (max 30 seconds)
        const backoffDelay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          30000
        );
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoffDelay);
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      logger.error('[MetadataSSE] Failed to create EventSource:', err);
    }
  }, [user?.id, queryClient]);

  useEffect(() => {
    if (!user?.id) return;

    // Connect to SSE
    connect();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [user?.id, connect]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs, close connection to save resources
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      } else if (user?.id) {
        // User came back, reconnect
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, connect]);
}

/**
 * useArtistMetadataSSE
 *
 * Convenience hook that listens for artist images updates for a specific artist.
 * Automatically handles cache invalidation for the specified artist.
 *
 * @param artistId - Optional artist ID to filter events (if not provided, listens to all)
 *
 * @example
 * ```tsx
 * function ArtistDetailPage({ artistId }: { artistId: string }) {
 *   useArtistMetadataSSE(artistId);
 *   // ...
 * }
 * ```
 */
export function useArtistMetadataSSE(artistId?: string) {
  const queryClient = useQueryClient();

  useMetadataSSE({
    onArtistImagesUpdated: (data) => {
      // If we're filtering by artistId, ignore updates for other artists
      if (artistId && data.artistId !== artistId) return;

      // Force immediate refetch
      queryClient.refetchQueries({
        queryKey: ['artists', data.artistId],
        type: 'active',
      });
      queryClient.refetchQueries({
        queryKey: ['artist-images', data.artistId],
        type: 'active',
      });

      // If no specific artist ID, refetch the artists list
      if (!artistId) {
        queryClient.refetchQueries({
          queryKey: ['artists'],
          type: 'active',
        });
      }
    },
  });
}

/**
 * useAlbumMetadataSSE
 *
 * Convenience hook that listens for album cover updates for a specific album.
 * Automatically handles cache invalidation for the specified album and related artist.
 *
 * @param albumId - Optional album ID to filter events (if not provided, listens to all)
 * @param artistId - Optional artist ID to also invalidate artist queries
 *
 * @example
 * ```tsx
 * function AlbumPage({ albumId }: { albumId: string }) {
 *   const { data: album } = useAlbum(albumId);
 *   useAlbumMetadataSSE(albumId, album?.artistId);
 *   // ...
 * }
 * ```
 */
export function useAlbumMetadataSSE(albumId?: string, artistId?: string) {
  const queryClient = useQueryClient();

  useMetadataSSE({
    onAlbumCoverUpdated: (data) => {
      // If we're filtering by albumId, ignore updates for other albums
      if (albumId && data.albumId !== albumId) return;

      // Force immediate refetch
      queryClient.refetchQueries({
        queryKey: ['albums', data.albumId],
        type: 'active',
      });
      queryClient.refetchQueries({
        queryKey: ['album-cover-metadata', data.albumId],
        type: 'active',
      });

      // If no specific album ID, refetch the albums list
      if (!albumId) {
        queryClient.refetchQueries({
          queryKey: ['albums'],
          type: 'active',
        });
      }

      // Also refetch artist queries (album covers appear on artist pages)
      if (data.artistId) {
        queryClient.refetchQueries({
          queryKey: ['artists', data.artistId],
          type: 'active',
        });
      }

      // If we have a specific artistId param, also refetch it
      if (artistId) {
        queryClient.refetchQueries({
          queryKey: ['artists', artistId],
          type: 'active',
        });
      }
    },
  });
}
