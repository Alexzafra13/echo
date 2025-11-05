import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
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
 */
@WebSocketGateway({
  namespace: 'metadata',
  cors: {
    origin: '*', // Configure based on your frontend URL in production
    credentials: true,
  },
})
export class MetadataEnrichmentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MetadataEnrichmentGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
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
    this.logger.log(
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
    this.logger.log(`Batch enrichment started: ${data.total} ${data.entityType}s`);
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
    this.logger.log(
      `Batch enrichment completed: ${data.successful}/${data.total} successful ` +
      `(${data.failed} failed) in ${data.duration}ms`
    );
  }
}
