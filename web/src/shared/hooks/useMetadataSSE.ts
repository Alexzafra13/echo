import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
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
 * Internal metadata event type
 */
type MetadataEventData =
  | { type: 'artist:images:updated'; data: ArtistImagesUpdatedEvent }
  | { type: 'album:cover:updated'; data: AlbumCoverUpdatedEvent }
  | { type: 'metadata:cache:invalidate'; data: CacheInvalidationEvent };

type MetadataEventHandler = (event: MetadataEventData) => void;

/**
 * Singleton manager for the Metadata SSE connection.
 * Ensures only one EventSource connection exists regardless of how many
 * hooks are subscribed. This prevents multiple connections to the same
 * endpoint which can cause performance issues and connection limits.
 */
class MetadataSSEManager {
  private eventSource: EventSource | null = null;
  private handlers: Set<MetadataEventHandler> = new Set();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private currentUserId: string | null = null;
  private queryClient: QueryClient | null = null;

  connect(userId: string, queryClient: QueryClient) {
    // Already connected for this user
    if (this.eventSource && this.currentUserId === userId) {
      return;
    }

    // Different user - close existing connection
    if (this.eventSource && this.currentUserId !== userId) {
      this.disconnect();
    }

    this.currentUserId = userId;
    this.queryClient = queryClient;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const url = `${apiUrl}/metadata/stream`;

      logger.debug('[MetadataSSE] Singleton connecting to:', url);

      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        logger.debug('[MetadataSSE] Singleton connected');
        this.reconnectAttempts = 0;
      };

      // Handle artist images updated
      this.eventSource.addEventListener('artist:images:updated', (event: MessageEvent) => {
        try {
          const data: ArtistImagesUpdatedEvent = JSON.parse(event.data);
          logger.debug('[MetadataSSE] Artist images updated:', data);

          // Notify all handlers
          this.notifyHandlers({ type: 'artist:images:updated', data });

          // Invalidate artist queries via the stored queryClient
          if (this.queryClient) {
            this.queryClient.refetchQueries({
              queryKey: ['artists', data.artistId],
              type: 'active',
            });
            this.queryClient.refetchQueries({
              queryKey: ['artist-images', data.artistId],
              type: 'active',
            });
          }
        } catch (err) {
          logger.error('[MetadataSSE] Failed to parse artist:images:updated:', err);
        }
      });

      // Handle album cover updated
      this.eventSource.addEventListener('album:cover:updated', (event: MessageEvent) => {
        try {
          const data: AlbumCoverUpdatedEvent = JSON.parse(event.data);
          logger.debug('[MetadataSSE] Album cover updated:', data);

          // Notify all handlers
          this.notifyHandlers({ type: 'album:cover:updated', data });

          // Invalidate album queries via the stored queryClient
          if (this.queryClient) {
            this.queryClient.refetchQueries({
              queryKey: ['albums', data.albumId],
              type: 'active',
            });
            this.queryClient.refetchQueries({
              queryKey: ['album-cover-metadata', data.albumId],
              type: 'active',
            });

            // Also invalidate artist queries (album covers appear on artist pages)
            if (data.artistId) {
              this.queryClient.refetchQueries({
                queryKey: ['artists', data.artistId],
                type: 'active',
              });
            }
          }
        } catch (err) {
          logger.error('[MetadataSSE] Failed to parse album:cover:updated:', err);
        }
      });

      // Handle cache invalidation
      this.eventSource.addEventListener('metadata:cache:invalidate', (event: MessageEvent) => {
        try {
          const data: CacheInvalidationEvent = JSON.parse(event.data);
          logger.debug('[MetadataSSE] Cache invalidation:', data);

          // Notify all handlers
          this.notifyHandlers({ type: 'metadata:cache:invalidate', data });

          // Invalidate the appropriate queries based on entity type
          if (this.queryClient) {
            if (data.entityType === 'artist') {
              this.queryClient.refetchQueries({
                queryKey: ['artists', data.entityId],
                type: 'active',
              });
            } else if (data.entityType === 'album') {
              this.queryClient.refetchQueries({
                queryKey: ['albums', data.entityId],
                type: 'active',
              });
            }
          }
        } catch (err) {
          logger.error('[MetadataSSE] Failed to parse metadata:cache:invalidate:', err);
        }
      });

      // Handle connection established
      this.eventSource.addEventListener('connected', (event: MessageEvent) => {
        logger.debug('[MetadataSSE] Metadata stream connected:', event.data);
      });

      // Handle keepalive
      this.eventSource.addEventListener('keepalive', () => {
        // Keepalive received - connection is healthy
      });

      // Handle connection errors
      this.eventSource.onerror = () => {
        logger.error('[MetadataSSE] Singleton connection error');
        this.eventSource?.close();
        this.eventSource = null;

        // Only reconnect if we still have subscribers
        if (this.handlers.size > 0 && this.currentUserId && this.queryClient) {
          const backoffDelay = Math.min(
            1000 * Math.pow(2, this.reconnectAttempts),
            30000
          );
          this.reconnectAttempts++;

          logger.debug(`[MetadataSSE] Reconnecting in ${backoffDelay}ms (attempt ${this.reconnectAttempts})`);

          this.reconnectTimeout = setTimeout(() => {
            if (this.currentUserId && this.queryClient) {
              this.connect(this.currentUserId, this.queryClient);
            }
          }, backoffDelay);
        }
      };

    } catch (err) {
      logger.error('[MetadataSSE] Failed to create EventSource:', err);
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.currentUserId = null;
    this.reconnectAttempts = 0;
  }

  subscribe(handler: MetadataEventHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
      // Disconnect if no more subscribers
      if (this.handlers.size === 0) {
        this.disconnect();
      }
    };
  }

  private notifyHandlers(event: MetadataEventData) {
    this.handlers.forEach((handler) => handler(event));
  }

  isConnected() {
    return this.eventSource !== null;
  }

  getCurrentUserId() {
    return this.currentUserId;
  }
}

// Singleton instance
const metadataSSEManager = new MetadataSSEManager();

/**
 * useMetadataSSE
 *
 * Hook for real-time metadata updates via Server-Sent Events
 *
 * Uses a shared singleton EventSource connection so multiple components
 * can subscribe without creating duplicate connections.
 *
 * When artist images or album covers are updated, this hook receives the update
 * instantly via SSE and can trigger cache invalidation.
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
  const handlersRef = useRef(handlers);

  // Keep handlers ref up to date
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const handleEvent = useCallback((event: MetadataEventData) => {
    switch (event.type) {
      case 'artist:images:updated':
        handlersRef.current?.onArtistImagesUpdated?.(event.data);
        break;
      case 'album:cover:updated':
        handlersRef.current?.onAlbumCoverUpdated?.(event.data);
        break;
      case 'metadata:cache:invalidate':
        handlersRef.current?.onCacheInvalidation?.(event.data);
        break;
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to events
    const unsubscribe = metadataSSEManager.subscribe(handleEvent);

    // Connect if not already connected or different user
    if (!metadataSSEManager.isConnected() || metadataSSEManager.getCurrentUserId() !== user.id) {
      metadataSSEManager.connect(user.id, queryClient);
    }

    return () => {
      unsubscribe();
    };
  }, [user?.id, queryClient, handleEvent]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Don't disconnect - other components might still need it
        // The manager will disconnect when all subscribers are gone
      } else if (user?.id && !metadataSSEManager.isConnected()) {
        metadataSSEManager.connect(user.id, queryClient);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, queryClient]);
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
