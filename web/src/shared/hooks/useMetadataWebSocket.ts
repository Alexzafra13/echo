import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import WebSocketService from '@shared/services/websocket.service';
import type { Socket } from 'socket.io-client';

/**
 * Events emitted by the metadata namespace
 */
export interface ArtistImagesUpdatedEvent {
  artistId: string;
  artistName: string;
  imageType: 'profile' | 'background' | 'banner' | 'logo';
  updatedAt: string;
  timestamp: string;
}

export interface AlbumCoverUpdatedEvent {
  albumId: string;
  albumName: string;
  artistId: string;
  updatedAt: string;
  timestamp: string;
}

export interface CacheInvalidationEvent {
  entityType: 'artist' | 'album';
  entityId: string;
  reason: string;
  timestamp: string;
}

/**
 * useMetadataWebSocket
 *
 * @deprecated This hook is deprecated. Use `useMetadataSSE` instead for better
 * performance and reduced overhead. SSE is more efficient for unidirectional
 * (server -> client) real-time updates.
 *
 * Base hook for connecting to the metadata WebSocket namespace.
 * Automatically connects when user is authenticated and disconnects on unmount.
 *
 * @returns Socket instance or null if not connected
 *
 * @example
 * ```tsx
 * // DEPRECATED - use useMetadataSSE instead
 * import { useMetadataSSE } from './useMetadataSSE';
 *
 * useMetadataSSE({
 *   onArtistImagesUpdated: (data) => console.log('Artist updated:', data),
 * });
 * ```
 */
export function useMetadataWebSocket(): Socket | null {
  // Deprecation warning in development
  if (import.meta.env.DEV) {
    console.warn(
      '[useMetadataWebSocket] This hook is deprecated. ' +
      'Use useMetadataSSE instead for better performance.'
    );
  }
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setSocket(null);
      return;
    }

    try {
      const metadataSocket = WebSocketService.connect('metadata', token);

      const handleConnect = () => {
        setSocket(metadataSocket);
      };

      if (metadataSocket.connected) {
        setSocket(metadataSocket);
      } else {
        metadataSocket.on('connect', handleConnect);
      }

      return () => {
        if (metadataSocket) {
          metadataSocket.off('connect', handleConnect);
        }
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[useMetadataWebSocket] Connection error:', error);
      }
      setSocket(null);
    }
  }, [token, isAuthenticated]);

  return socket;
}
