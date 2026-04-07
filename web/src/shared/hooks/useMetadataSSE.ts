import { useUnifiedSSE } from './useUnifiedSSE';

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

/**
 * useMetadataSSE
 *
 * Shared SSE connection to the unified events stream.
 * Returns the shared EventSource - consumers attach listeners
 * with `metadata:` prefixed event names.
 *
 * @returns EventSource instance or null if not connected
 */
export function useMetadataSSE(): EventSource | null {
  return useUnifiedSSE();
}
