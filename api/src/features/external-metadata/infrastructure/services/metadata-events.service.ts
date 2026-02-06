import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Subject, Observable } from 'rxjs';

export interface MetadataSSEEvent {
  event: string;
  data: Record<string, unknown>;
}

/**
 * MetadataEventsService
 *
 * Broadcasts metadata enrichment events via RxJS Subject.
 * Replaces the previous WebSocket gateway with SSE-compatible streams.
 * All connected SSE clients receive events through the controller's SSE endpoint.
 */
@Injectable()
export class MetadataEventsService {
  private readonly events$ = new Subject<MetadataSSEEvent>();

  constructor(
    @InjectPinoLogger(MetadataEventsService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Subscribe to all metadata events (used by SSE endpoint)
   */
  getEventsStream(): Observable<MetadataSSEEvent> {
    return this.events$.asObservable();
  }

  private emit(event: string, data: Record<string, unknown>) {
    this.events$.next({ event, data: { ...data, timestamp: new Date().toISOString() } });
  }

  emitEnrichmentStarted(data: {
    entityType: 'artist' | 'album';
    entityId: string;
    entityName: string;
    total: number;
  }) {
    this.emit('enrichment:started', data);
    this.logger.debug(`Enrichment started: ${data.entityType} ${data.entityName}`);
  }

  emitEnrichmentProgress(data: {
    entityType: 'artist' | 'album';
    entityId: string;
    entityName: string;
    current: number;
    total: number;
    step: string;
    details?: string;
  }) {
    this.emit('enrichment:progress', {
      ...data,
      percentage: Math.round((data.current / data.total) * 100),
    });
    this.logger.debug(
      `Enrichment progress: ${data.entityName} - ${data.step} (${data.current}/${data.total})`,
    );
  }

  emitEnrichmentCompleted(data: {
    entityType: 'artist' | 'album';
    entityId: string;
    entityName: string;
    bioUpdated?: boolean;
    imagesUpdated?: boolean;
    coverUpdated?: boolean;
    duration: number;
  }) {
    this.emit('enrichment:completed', data);
    this.logger.info(
      `Enrichment completed: ${data.entityName} in ${data.duration}ms ` +
        `(bio: ${data.bioUpdated}, images: ${data.imagesUpdated}, cover: ${data.coverUpdated})`,
    );
  }

  emitEnrichmentError(data: {
    entityType: 'artist' | 'album';
    entityId: string;
    entityName: string;
    error: string;
  }) {
    this.emit('enrichment:error', data);
    this.logger.error(`Enrichment error: ${data.entityName} - ${data.error}`);
  }

  emitBatchEnrichmentStarted(data: { entityType: 'artist' | 'album'; total: number }) {
    this.emit('batch:enrichment:started', data);
    this.logger.info(`Batch enrichment started: ${data.total} ${data.entityType}s`);
  }

  emitBatchEnrichmentProgress(data: {
    entityType: 'artist' | 'album';
    current: number;
    total: number;
    currentEntity: string;
  }) {
    this.emit('batch:enrichment:progress', {
      ...data,
      percentage: Math.round((data.current / data.total) * 100),
    });
    this.logger.debug(`Batch progress: ${data.current}/${data.total} - ${data.currentEntity}`);
  }

  emitBatchEnrichmentCompleted(data: {
    entityType: 'artist' | 'album';
    total: number;
    successful: number;
    failed: number;
    duration: number;
  }) {
    this.emit('batch:enrichment:completed', data);
    this.logger.info(
      `Batch enrichment completed: ${data.successful}/${data.total} successful ` +
        `(${data.failed} failed) in ${data.duration}ms`,
    );
  }

  emitArtistImagesUpdated(data: {
    artistId: string;
    artistName: string;
    imageType: 'profile' | 'background' | 'banner' | 'logo';
    updatedAt: Date;
  }) {
    this.emit('artist:images:updated', data);
    this.logger.info(`Artist images updated: ${data.artistName} (${data.imageType})`);
  }

  emitAlbumCoverUpdated(data: {
    albumId: string;
    albumName: string;
    artistId: string;
    updatedAt: Date;
  }) {
    this.emit('album:cover:updated', data);
    this.logger.info(`Album cover updated: ${data.albumName}`);
  }

  emitCacheInvalidation(data: {
    entityType: 'artist' | 'album';
    entityId: string;
    reason: string;
  }) {
    this.emit('metadata:cache:invalidate', data);
    this.logger.debug(`Cache invalidation: ${data.entityType}:${data.entityId} - ${data.reason}`);
  }

  emitQueueStarted(data: {
    totalPending: number;
    pendingArtists: number;
    pendingAlbums: number;
  }) {
    this.emit('queue:started', data);
    this.logger.info(`Queue started: ${data.totalPending} items pending`);
  }

  emitQueueStopped(data: { processedInSession: number }) {
    this.emit('queue:stopped', data);
    this.logger.info(`Queue stopped: ${data.processedInSession} items processed`);
  }

  emitQueueItemCompleted(data: {
    itemType: 'artist' | 'album';
    entityName: string;
    processedInSession: number;
    totalPending: number;
    estimatedTimeRemaining: string | null;
  }) {
    this.emit('queue:item:completed', data);
    this.logger.debug(`Queue item completed: ${data.entityName}`);
  }

  emitQueueItemError(data: {
    itemType: 'artist' | 'album';
    entityName: string;
    error: string;
  }) {
    this.emit('queue:item:error', data);
    this.logger.error(`Queue item error: ${data.entityName} - ${data.error}`);
  }

  emitQueueCompleted(data: { processedInSession: number; duration: string }) {
    this.emit('queue:completed', data);
    this.logger.info(`Queue completed: ${data.processedInSession} items in ${data.duration}`);
  }
}
