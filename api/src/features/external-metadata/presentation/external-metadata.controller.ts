import {
  Controller,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ExternalMetadataService } from '../application/external-metadata.service';
import { MetadataEnrichmentGateway } from './metadata-enrichment.gateway';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';

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
  constructor(
    @InjectPinoLogger(ExternalMetadataController.name)
    private readonly logger: PinoLogger,
    private readonly metadataService: ExternalMetadataService,
    private readonly gateway: MetadataEnrichmentGateway
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
