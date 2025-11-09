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
    console.log('[useMetadataWebSocket] Auth state:', { isAuthenticated, hasToken: !!token });

    if (!isAuthenticated || !token) {
      console.log('[useMetadataWebSocket] Not authenticated or no token, skipping WebSocket connection');
      setSocket(null);
      return;
    }

    console.log('[useMetadataWebSocket] Connecting to metadata namespace...');
    console.log('[useMetadataWebSocket] 🔍 CODE VERSION: v2.0 - About to connect...');

    // Connect to metadata namespace
    const wsService = WebSocketService.getInstance();
    console.log('[useMetadataWebSocket] 🔍 WebSocket service obtained:', !!wsService);

    const metadataSocket = wsService.connect('metadata', token);
    console.log('[useMetadataWebSocket] 🔍 Socket returned from connect:', !!metadataSocket);

    console.log('[useMetadataWebSocket] Socket instance created:', !!metadataSocket);
    console.log('[useMetadataWebSocket] Socket connected status:', metadataSocket.connected);
    console.log('[useMetadataWebSocket] Socket ID:', metadataSocket.id);

    // Wait for actual connection before setting state
    const handleConnect = () => {
      console.log('[useMetadataWebSocket] 🎯 Socket connected event fired, updating state');
      setSocket(metadataSocket);
    };

    // If already connected, set immediately. Otherwise wait for connect event.
    if (metadataSocket.connected) {
      console.log('[useMetadataWebSocket] ✅ Socket already connected, saving to state');
      setSocket(metadataSocket);
    } else {
      console.log('[useMetadataWebSocket] ⏳ Socket not yet connected, waiting for connect event...');
      metadataSocket.on('connect', handleConnect);
    }

    // Cleanup on unmount
    return () => {
      metadataSocket.off('connect', handleConnect);
      // Don't disconnect immediately - other components might be using it
      // WebSocket service handles connection pooling
      console.log('[useMetadataWebSocket] Component unmounting (connection kept alive for other components)');
    };
  }, [token, isAuthenticated]);

  console.log('[useMetadataWebSocket] Returning socket:', !!socket);
  return socket;
}
