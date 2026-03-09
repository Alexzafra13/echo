import { Controller, Get, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import {
  EnrichmentQueueService,
  EnrichmentQueueStats,
} from '../infrastructure/services/enrichment-queue.service';

// Cola de enriquecimiento: estadísticas, inicio, parada (solo admin)
@ApiTags('maintenance')
@Controller('maintenance')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class EnrichmentQueueController {
  constructor(
    @InjectPinoLogger(EnrichmentQueueController.name)
    private readonly logger: PinoLogger,
    private readonly enrichmentQueue: EnrichmentQueueService
  ) {}

  @Get('enrichment-queue/stats')
  @ApiOperation({
    summary: 'Get enrichment queue statistics',
    description:
      'Returns current status of the enrichment queue including pending items, progress, and estimated time (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics',
    schema: {
      type: 'object',
      properties: {
        isRunning: { type: 'boolean', description: 'Whether the queue is currently processing' },
        pendingArtists: { type: 'number', description: 'Number of artists pending enrichment' },
        pendingAlbums: { type: 'number', description: 'Number of albums pending enrichment' },
        totalPending: { type: 'number', description: 'Total items pending' },
        processedInSession: { type: 'number', description: 'Items processed in current session' },
        currentItem: { type: 'string', nullable: true, description: 'Currently processing item' },
        startedAt: { type: 'string', nullable: true, description: 'Session start time' },
        estimatedTimeRemaining: {
          type: 'string',
          nullable: true,
          description: 'Estimated time remaining',
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getEnrichmentQueueStats(): Promise<EnrichmentQueueStats> {
    return this.enrichmentQueue.getQueueStats();
  }

  @Post('enrichment-queue/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start enrichment queue',
    description:
      'Starts the background enrichment queue. Processes artists first (to get MBIDs), then albums. ' +
      'Items are processed one at a time with rate limiting delays (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Start result',
    schema: {
      type: 'object',
      properties: {
        started: { type: 'boolean', description: 'Whether the queue was started' },
        pending: { type: 'number', description: 'Number of items pending' },
        message: { type: 'string', description: 'Status message' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async startEnrichmentQueue() {
    this.logger.info('Manual request to start enrichment queue');
    return this.enrichmentQueue.startEnrichmentQueue();
  }

  @Post('enrichment-queue/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stop enrichment queue',
    description:
      'Stops the background enrichment queue. Current processing will complete but no new items will be started (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Stop result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async stopEnrichmentQueue() {
    this.logger.info('Manual request to stop enrichment queue');
    await this.enrichmentQueue.stopEnrichmentQueue();
    return {
      success: true,
      message: 'Enrichment queue stopped',
    };
  }
}
