import { useEffect, useState, useRef } from 'react';
import { logger } from '@shared/utils/logger';

export interface RadioMetadata {
  stationUuid: string;
  title?: string;
  artist?: string;
  song?: string;
  timestamp: number;
}

interface UseRadioMetadataOptions {
  stationUuid: string | null;
  streamUrl: string | null;
  isPlaying: boolean;
}

/**
 * Hook for streaming real-time ICY metadata from radio stations
 * Uses Server-Sent Events (SSE) for efficient one-way communication
 * Only connects when radio is actively playing
 * Automatically reconnects on errors with exponential backoff
 */
export function useRadioMetadata({
  stationUuid,
  streamUrl,
  isPlaying,
}: UseRadioMetadataOptions) {
  const [metadata, setMetadata] = useState<RadioMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const connectSSERef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Clear metadata immediately when station changes
    setMetadata(null);

    // Only connect if we have required data and radio is playing
    if (!stationUuid || !streamUrl || !isPlaying) {
      // Cleanup existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Create SSE connection
    const connectSSE = () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        const url = `${apiUrl}/radio/metadata/stream?stationUuid=${encodeURIComponent(stationUuid)}&streamUrl=${encodeURIComponent(streamUrl)}`;

        const eventSource = new EventSource(url);

        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
          reconnectAttemptsRef.current = 0; // Reset reconnect counter
        };

        // Handle metadata events
        eventSource.addEventListener('metadata', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            setMetadata(data);
          } catch (err) {
            logger.error('[ICY] Failed to parse metadata:', err);
          }
        });

        // Handle error events from server
        eventSource.addEventListener('error', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            setError(data.message);
          } catch (err) {
            // Ignore parse errors for error events
          }
        });

        // Handle keepalive
        eventSource.addEventListener('keepalive', (_event: MessageEvent) => {
          // Keepalive received
        });

        // Handle connection errors
        eventSource.onerror = (err) => {
          logger.error('[SSE] Connection error:', err);
          setIsConnected(false);

          // Close the event source
          eventSource.close();

          // Exponential backoff for reconnection (max 30 seconds)
          const backoffDelay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
              connectSSE();
            }
          }, backoffDelay);
        };

        eventSourceRef.current = eventSource;
      } catch (err) {
        logger.error('[SSE] Failed to create EventSource:', err);
        setError(err instanceof Error ? err.message : 'Connection failed');
      }
    };

    // Store connectSSE ref for visibility handler
    connectSSERef.current = connectSSE;

    // Initial connection
    connectSSE();

    // Cleanup on unmount or when dependencies change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsConnected(false);
    };
  }, [stationUuid, streamUrl, isPlaying]);

  // Handle page visibility changes (pause when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs, close connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
          setIsConnected(false);
        }
      } else if (isPlaying && stationUuid && streamUrl && !eventSourceRef.current) {
        // User came back, reconnect if still playing
        reconnectAttemptsRef.current = 0;
        connectSSERef.current?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, stationUuid, streamUrl]);

  return {
    metadata,
    error,
    isConnected,
  };
}
