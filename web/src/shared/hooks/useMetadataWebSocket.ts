import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import WebSocketService from '@shared/services/websocket.service';
import { logger } from '@shared/utils/logger';
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
 * Base hook for connecting to the metadata WebSocket namespace.
 * Automatically connects when user is authenticated and disconnects on unmount.
 *
 * @returns Socket instance or null if not connected
 *
 * @example
 * ```tsx
 * const socket = useMetadataWebSocket();
 *
 * useEffect(() => {
 *   if (!socket) return;
 *
 *   const handleUpdate = (data: ArtistImagesUpdatedEvent) => {
 *     console.log('Artist updated:', data);
 *   };
 *
 *   socket.on('artist:images:updated', handleUpdate);
 *   return () => { socket.off('artist:images:updated', handleUpdate); };
 * }, [socket]);
 * ```
 */
export function useMetadataWebSocket(): Socket | null {
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
        logger.error('[useMetadataWebSocket] Connection error:', error);
      }
      setSocket(null);
    }
  }, [token, isAuthenticated]);

  return socket;
}
