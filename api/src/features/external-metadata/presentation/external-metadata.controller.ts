import {
  Controller,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  Sse,
  Req,
} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Observable, map } from 'rxjs';
import { FastifyRequest } from 'fastify';
import { JwtService } from '@nestjs/jwt';
import { ExternalMetadataService } from '../application/external-metadata.service';
import { MetadataEventsService } from '../infrastructure/services/metadata-events.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { Public } from '@shared/decorators';

// Enriquecimiento de metadata desde APIs externas (Last.fm, Fanart.tv, MusicBrainz)
@ApiTags('external-metadata')
@Controller('metadata')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExternalMetadataController {
  constructor(
    @InjectPinoLogger(ExternalMetadataController.name)
    private readonly logger: PinoLogger,
    private readonly metadataService: ExternalMetadataService,
    private readonly gateway: MetadataEventsService,
    private readonly jwtService: JwtService,
  ) {}

  // SSE endpoint - EventSource doesn't support headers, so auth via JWT in query param
  @Sse('events/stream')
  @Public()
  @ApiOperation({
    summary: 'Stream de eventos de metadata (SSE)',
    description: 'Server-Sent Events para recibir actualizaciones de metadata en tiempo real.',
  })
  @ApiResponse({ status: 200, description: 'Stream de eventos de metadata' })
  streamMetadataEvents(
    @Query('token') token: string,
    @Req() request: FastifyRequest,
  ): Observable<MessageEvent> {
    let userId: string;
    try {
      const payload = this.jwtService.verify(token);
      userId = payload.userId;
    } catch {
      this.logger.warn('SSE metadata connection rejected: invalid or expired token');
      return new Observable((subscriber) => {
        subscriber.next({
          type: 'error',
          data: { message: 'Invalid or expired token' },
        } as MessageEvent);
        subscriber.complete();
      });
    }

    this.logger.info({ userId }, 'SSE client connected for metadata events');

    return new Observable((subscriber) => {
      // Send initial connected event
      subscriber.next({
        type: 'connected',
        data: { userId, timestamp: Date.now() },
      } as MessageEvent);

      // Subscribe to all metadata events
      const subscription = this.gateway
        .getEventsStream()
        .pipe(
          map((evt) => ({
            type: evt.event,
            data: evt.data,
          } as MessageEvent)),
        )
        .subscribe((event) => subscriber.next(event));

      // Send keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        subscriber.next({
          type: 'keepalive',
          data: { timestamp: Date.now() },
        } as MessageEvent);
      }, 30000);

      // Cleanup on client disconnect
      request.raw.on('close', () => {
        this.logger.info({ userId }, 'SSE client disconnected from metadata events');
        subscription.unsubscribe();
        clearInterval(keepaliveInterval);
        subscriber.complete();
      });
    });
  }

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
    @Param('id', ParseUUIDPipe) artistId: string,
    @Query('forceRefresh') forceRefresh?: string
  ) {
    const startTime = Date.now();
    const force = forceRefresh === 'true';

    try {
      // Emit start event
      this.gateway.emitEnrichmentStarted({
        entityType: 'artist',
        entityId: artistId,
        entityName: 'Artist', // Will be updated with actual name
        total: 2, // bio + images
      });

      // Perform enrichment
      const result = await this.metadataService.enrichArtist(artistId, force);
      const duration = Date.now() - startTime;

      // Emit completion event
      this.gateway.emitEnrichmentCompleted({
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
      this.gateway.emitEnrichmentError({
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
    @Param('id', ParseUUIDPipe) albumId: string,
    @Query('forceRefresh') forceRefresh?: string
  ) {
    const startTime = Date.now();
    const force = forceRefresh === 'true';

    try {
      // Emit start event
      this.gateway.emitEnrichmentStarted({
        entityType: 'album',
        entityId: albumId,
        entityName: 'Album',
        total: 1, // cover only
      });

      // Perform enrichment
      const result = await this.metadataService.enrichAlbum(albumId, force);
      const duration = Date.now() - startTime;

      // Emit completion event
      this.gateway.emitEnrichmentCompleted({
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
      this.gateway.emitEnrichmentError({
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
}
