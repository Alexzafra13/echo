import { useEffect, useState, useRef } from 'react';

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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    // Clear metadata immediately when station changes
    setMetadata(null);

    // Only connect if we have required data and radio is playing
    if (!stationUuid || !streamUrl || !isPlaying) {
      // Cleanup existing connection
      if (eventSourceRef.current) {
        console.log('🎵 [ICY] Closing metadata connection:', stationUuid);
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    console.log('🎵 [ICY] Attempting to connect:', { stationUuid, streamUrl, isPlaying });

    // Create SSE connection
    const connectSSE = () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4567/api';
        const url = `${apiUrl}/radio/metadata/stream?stationUuid=${encodeURIComponent(stationUuid)}&streamUrl=${encodeURIComponent(streamUrl)}`;

        console.log('🎵 [ICY] Connecting to SSE:', url);

        const eventSource = new EventSource(url);

        eventSource.onopen = () => {
          console.log('✅ [ICY] SSE Connected:', stationUuid);
          setIsConnected(true);
          setError(null);
          reconnectAttemptsRef.current = 0; // Reset reconnect counter
        };

        // Handle metadata events
        eventSource.addEventListener('metadata', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            setMetadata(data);
            console.log('🎵 [ICY] Metadata received:', data);
          } catch (err) {
            console.error('[ICY] Failed to parse metadata:', err);
          }
        });

        // Handle error events from server
        eventSource.addEventListener('error', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            console.warn('⚠️ [ICY] Metadata error:', data.message);
            setError(data.message);
          } catch (err) {
            // Ignore parse errors for error events
          }
        });

        // Handle keepalive
        eventSource.addEventListener('keepalive', (event: MessageEvent) => {
          console.log('💓 [ICY] Keepalive received');
        });

        // Handle connection errors
        eventSource.onerror = (err) => {
          console.error('❌ SSE Error:', err);
          setIsConnected(false);

          // Close the event source
          eventSource.close();

          // Exponential backoff for reconnection (max 30 seconds)
          const backoffDelay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          reconnectAttemptsRef.current += 1;

          console.log(`🔄 Reconnecting in ${backoffDelay}ms (attempt ${reconnectAttemptsRef.current})...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
              connectSSE();
            }
          }, backoffDelay);
        };

        eventSourceRef.current = eventSource;
      } catch (err) {
        console.error('Failed to create EventSource:', err);
        setError(err instanceof Error ? err.message : 'Connection failed');
      }
    };

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
          console.log('👁️ Tab hidden, closing SSE connection');
          eventSourceRef.current.close();
          eventSourceRef.current = null;
          setIsConnected(false);
        }
      } else if (isPlaying && stationUuid && streamUrl) {
        // User came back, reconnect if still playing
        console.log('👁️ Tab visible, reconnecting SSE');
        // The main useEffect will handle reconnection
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
