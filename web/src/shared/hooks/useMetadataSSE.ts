import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { logger } from '@shared/utils/logger';

/**
 * Events emitted by the metadata SSE stream
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

// Shared EventSource instance (singleton per token)
let sharedEventSource: EventSource | null = null;
let sharedToken: string | null = null;
let connectionCount = 0;

/**
 * useMetadataSSE
 *
 * Shared SSE connection to the metadata events stream.
 * Multiple hooks can use this simultaneously - the EventSource is shared
 * and only closed when all consumers unmount.
 *
 * Replaces the previous WebSocket-based useMetadataWebSocket hook.
 *
 * @returns EventSource instance or null if not connected
 */
export function useMetadataSSE(): EventSource | null {
  const { token, isAuthenticated } = useAuth();
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!isAuthenticated || !token) {
      setEventSource(null);
      return;
    }

    connectionCount++;

    // Reuse existing connection if token matches
    if (sharedEventSource && sharedToken === token && sharedEventSource.readyState !== EventSource.CLOSED) {
      setEventSource(sharedEventSource);
    } else {
      // Close stale connection
      if (sharedEventSource) {
        sharedEventSource.close();
      }

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const url = `${baseUrl}/api/metadata/events/stream?token=${encodeURIComponent(token)}`;

      const es = new EventSource(url);
      sharedEventSource = es;
      sharedToken = token;

      es.onopen = () => {
        logger.debug('[MetadataSSE] Connected');
        if (mountedRef.current) {
          setEventSource(es);
        }
      };

      es.onerror = () => {
        logger.debug('[MetadataSSE] Connection error (will auto-reconnect)');
      };

      es.addEventListener('keepalive', () => {
        // Silent keepalive
      });

      if (es.readyState === EventSource.OPEN) {
        setEventSource(es);
      }
    }

    return () => {
      mountedRef.current = false;
      connectionCount--;
      if (connectionCount <= 0) {
        sharedEventSource?.close();
        sharedEventSource = null;
        sharedToken = null;
        connectionCount = 0;
      }
    };
  }, [token, isAuthenticated]);

  // Close on logout
  useEffect(() => {
    if (!isAuthenticated && sharedEventSource) {
      sharedEventSource.close();
      sharedEventSource = null;
      sharedToken = null;
      connectionCount = 0;
      setEventSource(null);
    }
  }, [isAuthenticated]);

  return eventSource;
}
