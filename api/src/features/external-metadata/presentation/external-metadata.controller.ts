import {
  Controller,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Sse,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ExternalMetadataService } from '../application/external-metadata.service';
import { MetadataEventsService, MetadataEventType } from '../domain/services/metadata-events.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { Public } from '@shared/decorators/public.decorator';

/**
 * External Metadata Controller
 * HTTP endpoints for manual metadata enrichment
 *
 * Endpoints:
 * - POST /api/metadata/artists/:id/enrich - Enrich single artist
 * - POST /api/metadata/albums/:id/enrich - Enrich single album
 * - POST /api/metadata/artists/enrich-all - Enrich all artists (admin only)
 * - POST /api/metadata/albums/enrich-all - Enrich all albums (admin only)
 */
@ApiTags('external-metadata')
@Controller('metadata')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExternalMetadataController {
  private readonly logger = new Logger(ExternalMetadataController.name);

  constructor(
    private readonly metadataService: ExternalMetadataService,
    private readonly metadataEventsService: MetadataEventsService,
  ) {}

  /**
   * Enrich a single artist with external metadata
   * GET /api/metadata/artists/:id/enrich?forceRefresh=false
   */
  @Post('artists/:id/enrich')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enrich artist with external metadata',
    description: 'Fetches biography and images from external sources (Last.fm, Fanart.tv)',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrichment completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        artistId: { type: 'string' },
        bioUpdated: { type: 'boolean' },
        imagesUpdated: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
        duration: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  async enrichArtist(
    @Param('id') artistId: string,
    @Query('forceRefresh') forceRefresh?: string
  ) {
    const startTime = Date.now();
    const force = forceRefresh === 'true';

    try {
      // Emit start event
      this.metadataEventsService.emitEnrichmentStarted({
        entityType: 'artist',
        entityId: artistId,
        entityName: 'Artist', // Will be updated with actual name
        total: 2, // bio + images
      });

      // Perform enrichment
      const result = await this.metadataService.enrichArtist(artistId, force);
      const duration = Date.now() - startTime;

      // Emit completion event
      this.metadataEventsService.emitEnrichmentCompleted({
        entityType: 'artist',
        entityId: artistId,
        entityName: 'Artist',
        bioUpdated: result.bioUpdated,
        imagesUpdated: result.imagesUpdated,
        duration,
      });

      return {
        success: result.errors.length === 0,
        artistId,
        bioUpdated: result.bioUpdated,
        imagesUpdated: result.imagesUpdated,
        errors: result.errors,
        duration,
      };
    } catch (error) {
      this.logger.error(`Error enriching artist ${artistId}: ${(error as Error).message}`, (error as Error).stack);

      // Emit error event
      this.metadataEventsService.emitEnrichmentError({
        entityType: 'artist',
        entityId: artistId,
        entityName: 'Artist',
        error: (error as Error).message,
      });

      return {
        success: false,
        artistId,
        bioUpdated: false,
        imagesUpdated: false,
        errors: [(error as Error).message],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Enrich a single album with external metadata
   * POST /api/metadata/albums/:id/enrich?forceRefresh=false
   */
  @Post('albums/:id/enrich')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enrich album with external metadata',
    description: 'Fetches cover art from external sources (Cover Art Archive)',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrichment completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        albumId: { type: 'string' },
        coverUpdated: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
        duration: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Album not found' })
  async enrichAlbum(
    @Param('id') albumId: string,
    @Query('forceRefresh') forceRefresh?: string
  ) {
    const startTime = Date.now();
    const force = forceRefresh === 'true';

    try {
      // Emit start event
      this.metadataEventsService.emitEnrichmentStarted({
        entityType: 'album',
        entityId: albumId,
        entityName: 'Album',
        total: 1, // cover only
      });

      // Perform enrichment
      const result = await this.metadataService.enrichAlbum(albumId, force);
      const duration = Date.now() - startTime;

      // Emit completion event
      this.metadataEventsService.emitEnrichmentCompleted({
        entityType: 'album',
        entityId: albumId,
        entityName: 'Album',
        coverUpdated: result.coverUpdated,
        duration,
      });

      return {
        success: result.errors.length === 0,
        albumId,
        coverUpdated: result.coverUpdated,
        errors: result.errors,
        duration,
      };
    } catch (error) {
      this.logger.error(`Error enriching album ${albumId}: ${(error as Error).message}`, (error as Error).stack);

      // Emit error event
      this.metadataEventsService.emitEnrichmentError({
        entityType: 'album',
        entityId: albumId,
        entityName: 'Album',
        error: (error as Error).message,
      });

      return {
        success: false,
        albumId,
        coverUpdated: false,
        errors: [(error as Error).message],
        duration: Date.now() - startTime,
      };
    }
  }

  // ============================================
  // SSE: Real-time Metadata Updates
  // ============================================

  /**
   * GET /metadata/stream
   * Server-Sent Events endpoint for real-time metadata updates
   * Streams updates when artist images or album covers are updated
   *
   * Note: EventSource cannot send Authorization headers, so this endpoint
   * is public. All metadata updates are broadcasted to all connected clients.
   *
   * Events:
   * - artist:images:updated - When artist images are updated
   * - album:cover:updated - When album cover is updated
   * - metadata:cache:invalidate - When metadata cache needs refresh
   * - enrichment:* - Enrichment progress events
   * - queue:* - Queue status events
   */
  @Sse('stream')
  @Public()
  @ApiOperation({
    summary: 'SSE stream for real-time metadata updates',
    description: 'Subscribe to real-time metadata update events via Server-Sent Events',
  })
  streamMetadataUpdates(@Req() request: FastifyRequest): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      this.logger.log('Client connected to metadata SSE stream');

      // Subscribe to metadata events
      const handleEvent = (event: { type: MetadataEventType; data: Record<string, unknown> }) => {
        subscriber.next({
          type: event.type,
          data: event.data,
        } as MessageEvent);
      };

      const unsubscribe = this.metadataEventsService.subscribe(handleEvent);

      // Send keepalive every 30 seconds to prevent connection timeout
      const keepaliveInterval = setInterval(() => {
        subscriber.next({
          type: 'keepalive',
          data: { timestamp: Date.now() },
        } as MessageEvent);
      }, 30000);

      // Send initial "connected" event
      subscriber.next({
        type: 'connected',
        data: { timestamp: Date.now() },
      } as MessageEvent);

      // Cleanup on client disconnect
      request.raw.on('close', () => {
        this.logger.log('Client disconnected from metadata SSE stream');
        unsubscribe();
        clearInterval(keepaliveInterval);
        subscriber.complete();
      });
    });
  }
}
