import { Controller, Get, Put, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { MbidAutoSearchService } from '../infrastructure/services/mbid-auto-search.service';
import { SettingsService } from '../infrastructure/services/settings.service';

// Configuración de búsqueda automática de MBIDs durante escaneo
@ApiTags('Admin - MBID Auto-Search')
@Controller('admin/mbid-auto-search')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class MbidAutoSearchController {
  constructor(
    private readonly mbidAutoSearchService: MbidAutoSearchService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get auto-search configuration',
    description: 'Retrieve current MusicBrainz ID auto-search settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Whether auto-search is enabled',
          example: false,
        },
        confidenceThreshold: {
          type: 'number',
          description: 'Minimum score (0-100) to auto-apply MBID without user confirmation',
          example: 95,
        },
        description: {
          type: 'string',
          example:
            'Auto-search finds MusicBrainz IDs during library scan. Scores ≥95 are auto-applied, 75-94 create conflicts for review, <75 are ignored.',
        },
      },
    },
  })
  async getConfig() {
    const enabled = await this.settingsService.getBoolean(
      'metadata.auto_search_mbid.enabled',
      false,
    );
    const confidenceThreshold = await this.settingsService.getNumber(
      'metadata.auto_search_mbid.confidence_threshold',
      95,
    );

    return {
      enabled,
      confidenceThreshold,
      description:
        'Auto-search finds MusicBrainz IDs during library scan. ' +
        `Scores ≥${confidenceThreshold} are auto-applied, ` +
        `75-${confidenceThreshold - 1} create conflicts for review, ` +
        '<75 are ignored.',
    };
  }

  @Put('config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update auto-search configuration',
    description: 'Configure MusicBrainz ID auto-search behavior',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable or disable auto-search',
          example: true,
        },
        confidenceThreshold: {
          type: 'number',
          description:
            'Minimum score (75-100) to auto-apply MBID. Recommended: 95 for safety, 90 for more automation.',
          example: 95,
          minimum: 75,
          maximum: 100,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Auto-search configuration updated' },
        config: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            confidenceThreshold: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid configuration (threshold must be 75-100)',
  })
  async updateConfig(
    @Body() body: { enabled?: boolean; confidenceThreshold?: number },
  ) {
    const updates: Array<[string, any]> = [];

    if (typeof body.enabled === 'boolean') {
      await this.settingsService.set('metadata.auto_search_mbid.enabled', body.enabled);
      updates.push(['enabled', body.enabled]);
    }

    if (typeof body.confidenceThreshold === 'number') {
      // Validate threshold
      if (body.confidenceThreshold < 75 || body.confidenceThreshold > 100) {
        throw new Error(
          'Confidence threshold must be between 75 and 100. ' +
            'Lower values may cause incorrect MBIDs to be applied automatically.',
        );
      }

      await this.settingsService.set(
        'metadata.auto_search_mbid.confidence_threshold',
        body.confidenceThreshold,
      );
      updates.push(['confidenceThreshold', body.confidenceThreshold]);
    }

    // Get final configuration
    const finalConfig = {
      enabled: await this.settingsService.getBoolean(
        'metadata.auto_search_mbid.enabled',
        false,
      ),
      confidenceThreshold: await this.settingsService.getNumber(
        'metadata.auto_search_mbid.confidence_threshold',
        95,
      ),
    };

    return {
      success: true,
      message: `Auto-search configuration updated: ${updates.map(([k, v]) => `${k}=${v}`).join(', ')}`,
      config: finalConfig,
    };
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get auto-search statistics',
    description:
      'View statistics about MBID auto-search activity (how many were auto-applied, conflicts created, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalAutoSearched: {
          type: 'number',
          description: 'Total entities that were auto-searched',
          example: 150,
        },
        autoApplied: {
          type: 'number',
          description: 'MBIDs that were auto-applied (high confidence)',
          example: 100,
        },
        conflictsCreated: {
          type: 'number',
          description: 'Conflicts created for manual review (medium confidence)',
          example: 30,
        },
        ignored: {
          type: 'number',
          description: 'Searches that were ignored (low confidence)',
          example: 20,
        },
      },
    },
  })
  async getStats() {
    return await this.mbidAutoSearchService.getAutoSearchStats();
  }
}
