import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Server, Socket } from 'socket.io';

/**
 * Metadata Enrichment WebSocket Gateway
 * Provides real-time updates during metadata enrichment process
 *
 * Events emitted to clients:
 * - enrichment:started - Enrichment process started
 * - enrichment:progress - Progress update during enrichment
 * - enrichment:completed - Enrichment completed successfully
 * - enrichment:error - Error occurred during enrichment
 *
 * Note: This gateway does NOT require authentication to allow
 * receiving metadata updates without JWT token overhead.
 */
@WebSocketGateway({
  namespace: 'metadata',
  cors: {
    origin: '*', // Configured in WebSocketAdapter based on CORS_ORIGINS env var
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class MetadataEnrichmentGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @InjectPinoLogger(MetadataEnrichmentGateway.name)
    private readonly logger: PinoLogger,
  ) {}

  @WebSocketServer()
  server!: Server;
  afterInit(server: Server) {
    this.logger.info('🔌 MetadataEnrichmentGateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.info(`Client connected to metadata namespace: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.info(`Client disconnected from metadata namespace: ${client.id}`);
  }

  /**
   * Emit enrichment started event
   */
  emitEnrichmentStarted(data: {
    entityType: 'artist' | 'album';
    entityId: string;
    entityName: string;
    total: number;
  }) {
    this.server.emit('enrichment:started', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Enrichment started: ${data.entityType} ${data.entityName}`);
  }

  /**
   * Emit enrichment progress event
   */
  emitEnrichmentProgress(data: {
    entityType: 'artist' | 'album';
    entityId: string;
    entityName: string;
    current: number;
    total: number;
    step: string;
    details?: string;
  }) {
    this.server.emit('enrichment:progress', {
      ...data,
      percentage: Math.round((data.current / data.total) * 100),
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(
      `Enrichment progress: ${data.entityName} - ${data.step} (${data.current}/${data.total})`
    );
  }

  /**
   * Emit enrichment completed event
   */
  emitEnrichmentCompleted(data: {
    entityType: 'artist' | 'album';
    entityId: string;
    entityName: string;
    bioUpdated?: boolean;
    imagesUpdated?: boolean;
    coverUpdated?: boolean;
    duration: number;
  }) {
    this.server.emit('enrichment:completed', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.info(
      `Enrichment completed: ${data.entityName} in ${data.duration}ms ` +
      `(bio: ${data.bioUpdated}, images: ${data.imagesUpdated}, cover: ${data.coverUpdated})`
    );
  }

  /**
   * Emit enrichment error event
   */
  emitEnrichmentError(data: {
    entityType: 'artist' | 'album';
    entityId: string;
    entityName: string;
    error: string;
  }) {
    this.server.emit('enrichment:error', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.error(`Enrichment error: ${data.entityName} - ${data.error}`);
  }

  /**
   * Emit batch enrichment started event
   */
  emitBatchEnrichmentStarted(data: {
    entityType: 'artist' | 'album';
    total: number;
  }) {
    this.server.emit('batch:enrichment:started', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.info(`Batch enrichment started: ${data.total} ${data.entityType}s`);
  }

  /**
   * Emit batch enrichment progress event
   */
  emitBatchEnrichmentProgress(data: {
    entityType: 'artist' | 'album';
    current: number;
    total: number;
    currentEntity: string;
  }) {
    this.server.emit('batch:enrichment:progress', {
      ...data,
      percentage: Math.round((data.current / data.total) * 100),
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(
      `Batch progress: ${data.current}/${data.total} - ${data.currentEntity}`
    );
  }

  /**
   * Emit batch enrichment completed event
   */
  emitBatchEnrichmentCompleted(data: {
    entityType: 'artist' | 'album';
    total: number;
    successful: number;
    failed: number;
    duration: number;
  }) {
    this.server.emit('batch:enrichment:completed', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.info(
      `Batch enrichment completed: ${data.successful}/${data.total} successful ` +
      `(${data.failed} failed) in ${data.duration}ms`
    );
  }

  /**
   * Emit artist images updated event
   * Used when artist avatar, background, banner, or logo is manually updated
   */
  emitArtistImagesUpdated(data: {
    artistId: string;
    artistName: string;
    imageType: 'profile' | 'background' | 'banner' | 'logo';
    updatedAt: Date;
  }) {
    const payload = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    // Emit to all clients
    this.server.emit('artist:images:updated', payload);

    // Emit to specific artist room (if clients are subscribed)
    this.server.to(`artist:${data.artistId}`).emit('artist:images:updated', payload);

    this.logger.info(
      `Artist images updated: ${data.artistName} (${data.imageType}) - notified via WebSocket`
    );
  }

  /**
   * Emit album cover updated event
   * Used when album cover is manually updated
   */
  emitAlbumCoverUpdated(data: {
    albumId: string;
    albumName: string;
    artistId: string;
    updatedAt: Date;
  }) {
    const payload = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    // Emit to all clients
    this.server.emit('album:cover:updated', payload);

    // Emit to specific album room (if clients are subscribed)
    this.server.to(`album:${data.albumId}`).emit('album:cover:updated', payload);

    // Also emit to artist room (album cover affects artist detail page)
    this.server.to(`artist:${data.artistId}`).emit('album:cover:updated', payload);

    this.logger.info(
      `Album cover updated: ${data.albumName} - notified via WebSocket`
    );
  }

  /**
   * Emit metadata cache invalidation event
   * Generic event for any metadata changes that require cache refresh
   */
  emitCacheInvalidation(data: {
    entityType: 'artist' | 'album';
    entityId: string;
    reason: string;
  }) {
    const payload = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    this.server.emit('metadata:cache:invalidate', payload);

    this.logger.debug(
      `Cache invalidation: ${data.entityType}:${data.entityId} - ${data.reason}`
    );
  }

  // ========================
  // ENRICHMENT QUEUE EVENTS
  // ========================

  /**
   * Emit enrichment queue started event
   */
  emitQueueStarted(data: {
    totalPending: number;
    pendingArtists: number;
    pendingAlbums: number;
  }) {
    this.server.emit('queue:started', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.info(`Queue started: ${data.totalPending} items pending`);
  }

  /**
   * Emit enrichment queue stopped event
   */
  emitQueueStopped(data: { processedInSession: number }) {
    this.server.emit('queue:stopped', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.info(`Queue stopped: ${data.processedInSession} items processed`);
  }

  /**
   * Emit enrichment queue item completed event
   */
  emitQueueItemCompleted(data: {
    itemType: 'artist' | 'album';
    entityName: string;
    processedInSession: number;
    totalPending: number;
    estimatedTimeRemaining: string | null;
  }) {
    this.server.emit('queue:item:completed', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Queue item completed: ${data.entityName}`);
  }

  /**
   * Emit enrichment queue item error event
   */
  emitQueueItemError(data: {
    itemType: 'artist' | 'album';
    entityName: string;
    error: string;
  }) {
    this.server.emit('queue:item:error', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.error(`Queue item error: ${data.entityName} - ${data.error}`);
  }

  /**
   * Emit enrichment queue completed event
   */
  emitQueueCompleted(data: {
    processedInSession: number;
    duration: string;
  }) {
    this.server.emit('queue:completed', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.info(`Queue completed: ${data.processedInSession} items in ${data.duration}`);
  }
}
