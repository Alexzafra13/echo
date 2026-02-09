import { useEffect, useState, useMemo } from 'react';
import { useSSE } from '@shared/hooks';
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

  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  const url = stationUuid && streamUrl && isPlaying
    ? `${apiUrl}/radio/metadata/stream?stationUuid=${encodeURIComponent(stationUuid)}&streamUrl=${encodeURIComponent(streamUrl)}`
    : null;

  // Reset metadata when station/stream changes or stops playing
  useEffect(() => {
    setMetadata(null);
  }, [stationUuid, streamUrl, isPlaying]);

  const events = useMemo(() => ({
    'metadata': (event: MessageEvent) => {
      try {
        setMetadata(JSON.parse(event.data));
      } catch (err) {
        logger.error('[ICY] Failed to parse metadata:', err);
      }
    },
    'error': (event: MessageEvent) => {
      try {
        setError(JSON.parse(event.data).message);
      } catch {
        // Ignore parse errors for error events
      }
    },
  }), []);

  useSSE({
    url,
    label: 'RadioMetadata',
    onOpen: () => {
      setError(null);
    },
    onConnectionChange: setIsConnected,
    events,
  });

  return {
    metadata,
    error,
    isConnected,
  };
}
