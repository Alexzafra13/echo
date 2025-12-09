import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

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
  | 'queue:completed';

/**
 * Artist images updated event payload
 */
export interface ArtistImagesUpdatedPayload {
  artistId: string;
  artistName: string;
  imageType: 'profile' | 'background' | 'banner' | 'logo';
  updatedAt: Date;
}

/**
 * Album cover updated event payload
 */
export interface AlbumCoverUpdatedPayload {
  albumId: string;
  albumName: string;
  artistId: string;
  updatedAt: Date;
}

/**
 * Cache invalidation event payload
 */
export interface CacheInvalidationPayload {
  entityType: 'artist' | 'album';
  entityId: string;
  reason: string;
}

/**
 * Enrichment started event payload
 */
export interface EnrichmentStartedPayload {
  entityType: 'artist' | 'album';
  entityId: string;
  entityName: string;
  total: number;
}

/**
 * Enrichment progress event payload
 */
export interface EnrichmentProgressPayload {
  entityType: 'artist' | 'album';
  entityId: string;
  entityName: string;
  current: number;
  total: number;
  step: string;
  details?: string;
}

/**
 * Enrichment completed event payload
 */
export interface EnrichmentCompletedPayload {
  entityType: 'artist' | 'album';
  entityId: string;
  entityName: string;
  bioUpdated?: boolean;
  imagesUpdated?: boolean;
  coverUpdated?: boolean;
  duration: number;
}

/**
 * Enrichment error event payload
 */
export interface EnrichmentErrorPayload {
  entityType: 'artist' | 'album';
  entityId: string;
  entityName: string;
  error: string;
}

/**
 * Batch enrichment started payload
 */
export interface BatchEnrichmentStartedPayload {
  entityType: 'artist' | 'album';
  total: number;
}

/**
 * Batch enrichment progress payload
 */
export interface BatchEnrichmentProgressPayload {
  entityType: 'artist' | 'album';
  current: number;
  total: number;
  currentEntity: string;
}

/**
 * Batch enrichment completed payload
 */
export interface BatchEnrichmentCompletedPayload {
  entityType: 'artist' | 'album';
  total: number;
  successful: number;
  failed: number;
  duration: number;
}

/**
 * Queue started payload
 */
export interface QueueStartedPayload {
  totalPending: number;
  pendingArtists: number;
  pendingAlbums: number;
}

/**
 * Queue stopped payload
 */
export interface QueueStoppedPayload {
  processedInSession: number;
}

/**
 * Queue item completed payload
 */
export interface QueueItemCompletedPayload {
  itemType: 'artist' | 'album';
  entityName: string;
  processedInSession: number;
  totalPending: number;
  estimatedTimeRemaining: string | null;
}

/**
 * Queue item error payload
 */
export interface QueueItemErrorPayload {
  itemType: 'artist' | 'album';
  entityName: string;
  error: string;
}

/**
 * Queue completed payload
 */
export interface QueueCompletedPayload {
  processedInSession: number;
  duration: string;
}

/**
 * Union type for all metadata event payloads
 */
export type MetadataEventPayload =
  | { type: 'artist:images:updated'; data: ArtistImagesUpdatedPayload }
  | { type: 'album:cover:updated'; data: AlbumCoverUpdatedPayload }
  | { type: 'metadata:cache:invalidate'; data: CacheInvalidationPayload }
  | { type: 'enrichment:started'; data: EnrichmentStartedPayload }
  | { type: 'enrichment:progress'; data: EnrichmentProgressPayload }
  | { type: 'enrichment:completed'; data: EnrichmentCompletedPayload }
  | { type: 'enrichment:error'; data: EnrichmentErrorPayload }
  | { type: 'batch:enrichment:started'; data: BatchEnrichmentStartedPayload }
  | { type: 'batch:enrichment:progress'; data: BatchEnrichmentProgressPayload }
  | { type: 'batch:enrichment:completed'; data: BatchEnrichmentCompletedPayload }
  | { type: 'queue:started'; data: QueueStartedPayload }
  | { type: 'queue:stopped'; data: QueueStoppedPayload }
  | { type: 'queue:item:completed'; data: QueueItemCompletedPayload }
  | { type: 'queue:item:error'; data: QueueItemErrorPayload }
  | { type: 'queue:completed'; data: QueueCompletedPayload };

/**
 * MetadataEventsService
 *
 * Manages real-time notifications for metadata updates.
 * Uses EventEmitter pattern to notify connected SSE clients.
 *
 * This service is the central hub for all metadata-related events:
 * - Artist images updated
 * - Album covers updated
 * - Enrichment progress
 * - Queue status updates
 */
@Injectable()
export class MetadataEventsService {
  private readonly emitter = new EventEmitter();

  constructor(
    @InjectPinoLogger(MetadataEventsService.name)
    private readonly logger: PinoLogger,
  ) {
    // Increase max listeners since many users may subscribe
    this.emitter.setMaxListeners(1000);
  }

  /**
   * Emit a metadata event
   */
  emit(event: MetadataEventPayload): void {
    const payload = {
      ...event.data,
      timestamp: new Date().toISOString(),
    };
    this.logger.debug({ type: event.type, payload }, 'Emitting metadata event');
    this.emitter.emit('metadata-event', { type: event.type, data: payload });
  }

  /**
   * Emit artist images updated event
   */
  emitArtistImagesUpdated(data: ArtistImagesUpdatedPayload): void {
    this.emit({ type: 'artist:images:updated', data });
  }

  /**
   * Emit album cover updated event
   */
  emitAlbumCoverUpdated(data: AlbumCoverUpdatedPayload): void {
    this.emit({ type: 'album:cover:updated', data });
  }

  /**
   * Emit cache invalidation event
   */
  emitCacheInvalidation(data: CacheInvalidationPayload): void {
    this.emit({ type: 'metadata:cache:invalidate', data });
  }

  /**
   * Emit enrichment started event
   */
  emitEnrichmentStarted(data: EnrichmentStartedPayload): void {
    this.emit({ type: 'enrichment:started', data });
  }

  /**
   * Emit enrichment progress event
   */
  emitEnrichmentProgress(data: EnrichmentProgressPayload): void {
    this.emit({ type: 'enrichment:progress', data });
  }

  /**
   * Emit enrichment completed event
   */
  emitEnrichmentCompleted(data: EnrichmentCompletedPayload): void {
    this.emit({ type: 'enrichment:completed', data });
  }

  /**
   * Emit enrichment error event
   */
  emitEnrichmentError(data: EnrichmentErrorPayload): void {
    this.emit({ type: 'enrichment:error', data });
  }

  /**
   * Emit batch enrichment started event
   */
  emitBatchEnrichmentStarted(data: BatchEnrichmentStartedPayload): void {
    this.emit({ type: 'batch:enrichment:started', data });
  }

  /**
   * Emit batch enrichment progress event
   */
  emitBatchEnrichmentProgress(data: BatchEnrichmentProgressPayload): void {
    this.emit({ type: 'batch:enrichment:progress', data });
  }

  /**
   * Emit batch enrichment completed event
   */
  emitBatchEnrichmentCompleted(data: BatchEnrichmentCompletedPayload): void {
    this.emit({ type: 'batch:enrichment:completed', data });
  }

  /**
   * Emit queue started event
   */
  emitQueueStarted(data: QueueStartedPayload): void {
    this.emit({ type: 'queue:started', data });
  }

  /**
   * Emit queue stopped event
   */
  emitQueueStopped(data: QueueStoppedPayload): void {
    this.emit({ type: 'queue:stopped', data });
  }

  /**
   * Emit queue item completed event
   */
  emitQueueItemCompleted(data: QueueItemCompletedPayload): void {
    this.emit({ type: 'queue:item:completed', data });
  }

  /**
   * Emit queue item error event
   */
  emitQueueItemError(data: QueueItemErrorPayload): void {
    this.emit({ type: 'queue:item:error', data });
  }

  /**
   * Emit queue completed event
   */
  emitQueueCompleted(data: QueueCompletedPayload): void {
    this.emit({ type: 'queue:completed', data });
  }

  /**
   * Subscribe to all metadata events
   */
  subscribe(
    callback: (event: { type: MetadataEventType; data: Record<string, unknown> }) => void,
  ): () => void {
    this.emitter.on('metadata-event', callback);
    return () => this.emitter.off('metadata-event', callback);
  }

  /**
   * Get the event emitter for direct access
   */
  getEmitter(): EventEmitter {
    return this.emitter;
  }
}
