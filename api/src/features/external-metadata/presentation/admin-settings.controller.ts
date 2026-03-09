import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { SettingsService } from '../infrastructure/services/settings.service';
import { EnrichmentQueueService } from '../infrastructure/services/enrichment-queue.service';
import { FanartTvAgent } from '../infrastructure/agents/fanart-tv.agent';
import { LastfmAgent } from '../infrastructure/agents/lastfm.agent';

class UpdateSettingDto {
  @IsString()
  value!: string;
}

class ValidateApiKeyDto {
  @IsIn(['lastfm', 'fanart'])
  service!: 'lastfm' | 'fanart';

  @IsString()
  apiKey!: string;
}

class BrowseDirectoriesDto {
  @IsString()
  path!: string;
}

class ValidateStoragePathDto {
  @IsString()
  path!: string;
}

// Configuración de metadata externa: API keys, rutas, agentes (solo admin)
@ApiTags('admin-settings')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminSettingsController {
  constructor(
    @InjectPinoLogger(AdminSettingsController.name)
    private readonly logger: PinoLogger,
    private readonly settingsService: SettingsService,
    private readonly enrichmentQueueService: EnrichmentQueueService,
    private readonly fanartAgent: FanartTvAgent,
    private readonly lastfmAgent: LastfmAgent
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all settings',
    description: 'Returns all configuration settings (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
          category: { type: 'string' },
          type: { type: 'string' },
          description: { type: 'string' },
          isPublic: { type: 'boolean' },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAllSettings() {
    return this.settingsService.findAll();
  }

  @Get('category/:category')
  @ApiOperation({
    summary: 'Get settings by category',
    description: 'Returns all settings in a specific category (admin only)',
  })
  @ApiParam({
    name: 'category',
    description: 'Category name',
    example: 'metadata.providers',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getSettingsByCategory(@Param('category') category: string) {
    return this.settingsService.findByCategory(category);
  }

  @Get(':key')
  @ApiOperation({
    summary: 'Get specific setting',
    description:
      'Returns a specific configuration setting by key (admin only). Returns null if not found.',
  })
  @ApiParam({
    name: 'key',
    description: 'Setting key',
    example: 'metadata.providers.coverart.enabled',
  })
  @ApiResponse({
    status: 200,
    description: 'Setting retrieved successfully (or null if not found)',
    schema: {
      type: 'object',
      nullable: true,
      properties: {
        key: { type: 'string' },
        value: { type: 'string' },
        category: { type: 'string' },
        type: { type: 'string' },
        description: { type: 'string' },
        isPublic: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getSetting(@Param('key') key: string) {
    return (await this.settingsService.findOne(key)) ?? null;
  }

  @Put(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update or create setting',
    description: 'Updates or creates a configuration setting (admin only)',
  })
  @ApiParam({
    name: 'key',
    description: 'Setting key',
    example: 'metadata.providers.lastfm.enabled',
  })
  @ApiBody({
    description: 'New value for the setting',
    schema: {
      type: 'object',
      properties: {
        value: { type: 'string', example: 'true' },
      },
      required: ['value'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Setting updated/created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        key: { type: 'string' },
        oldValue: { type: 'string', nullable: true },
        newValue: { type: 'string' },
        created: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async updateSetting(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    const currentSetting = await this.settingsService.findOne(key);
    const oldValue = currentSetting?.value ?? null;
    const isCreating = !currentSetting;

    await this.settingsService.set(key, dto.value);

    this.logger.info(
      isCreating
        ? `Setting ${key} created with value "${dto.value}"`
        : `Setting ${key} updated from "${oldValue}" to "${dto.value}"`
    );

    this.settingsService.clearCache();
    await this.reloadAgentsIfNeeded(key);

    return { success: true, key, oldValue, newValue: dto.value, created: isCreating };
  }

  // Recarga agentes si se actualiza su API key y resetea items sin datos
  private async reloadAgentsIfNeeded(key: string): Promise<void> {
    const fanartWasEnabled = this.fanartAgent.isEnabled();
    const lastfmWasEnabled = this.lastfmAgent.isEnabled();

    let agentBecameEnabled = false;

    if (key.includes('fanart')) {
      this.logger.info('Reloading Fanart.tv agent settings...');
      await this.fanartAgent.loadSettings();
      const fanartNowEnabled = this.fanartAgent.isEnabled();
      this.logger.info(`Fanart.tv agent reloaded (enabled: ${fanartNowEnabled})`);

      if (!fanartWasEnabled && fanartNowEnabled) {
        agentBecameEnabled = true;
        this.logger.info('Fanart.tv agent was just enabled!');
      }
    }

    if (key.includes('lastfm')) {
      this.logger.info('Reloading Last.fm agent settings...');
      await this.lastfmAgent.loadSettings();
      const lastfmNowEnabled = this.lastfmAgent.isEnabled();
      this.logger.info(`Last.fm agent reloaded (enabled: ${lastfmNowEnabled})`);

      if (!lastfmWasEnabled && lastfmNowEnabled) {
        agentBecameEnabled = true;
        this.logger.info('Last.fm agent was just enabled!');
      }
    }

    // If an agent was just enabled, reset enrichment state for items without external data
    if (agentBecameEnabled) {
      this.logger.info(
        'Agent enabled - resetting enrichment state for items without external data...'
      );
      try {
        const resetResult = await this.enrichmentQueueService.resetEnrichmentState({
          resetArtists: true,
          resetAlbums: true,
          onlyWithoutExternalData: true,
        });
        this.logger.info(
          `Enrichment state reset: ${resetResult.artistsReset} artists, ${resetResult.albumsReset} albums ` +
            `are now ready for re-processing`
        );
      } catch (error) {
        // Don't throw - this is a nice-to-have, not critical
        this.logger.warn(`Failed to reset enrichment state: ${(error as Error).message}`);
      }
    }
  }

  @Post('validate-api-key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate external API key',
    description:
      'Validates an API key for an external service (Last.fm or Fanart.tv) by making a test request (admin only)',
  })
  @ApiBody({
    description: 'Service and API key to validate',
    schema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          enum: ['lastfm', 'fanart'],
          example: 'lastfm',
        },
        apiKey: { type: 'string', example: 'your-api-key-here' },
      },
      required: ['service', 'apiKey'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        service: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async validateApiKey(@Body() dto: ValidateApiKeyDto) {
    // This try-catch is intentional: validation errors return a graceful response, not 500
    try {
      this.logger.info(`Validating API key for ${dto.service}`);

      const isValid = await this.settingsService.validateApiKey(dto.service, dto.apiKey);

      return {
        valid: isValid,
        service: dto.service,
        message: isValid ? 'API key is valid' : 'API key is invalid or service is unavailable',
      };
    } catch (error) {
      return {
        valid: false,
        service: dto.service,
        message: (error as Error).message || 'Validation failed',
      };
    }
  }

  @Delete(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete setting (reset to default)',
    description: 'Deletes a configuration setting, resetting it to default value (admin only)',
  })
  @ApiParam({
    name: 'key',
    description: 'Setting key',
    example: 'metadata.providers.lastfm.api_key',
  })
  @ApiResponse({
    status: 200,
    description: 'Setting deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        key: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async deleteSetting(@Param('key') key: string) {
    const setting = await this.settingsService.findOne(key);

    if (!setting) {
      throw new BadRequestException(`Setting with key ${key} not found`);
    }

    await this.settingsService.delete(key);
    this.logger.info(`Setting ${key} deleted (reset to default)`);
    this.settingsService.clearCache();

    return { success: true, key, message: 'Setting deleted successfully' };
  }

  @Post('browse-directories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Browse server directories',
    description: 'Lists directories and subdirectories for file browser (admin only)',
  })
  @ApiBody({
    description: 'Path to browse',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', example: '/app' },
      },
      required: ['path'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Directory listing retrieved',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        parent: { type: 'string' },
        directories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              path: { type: 'string' },
              writable: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async browseDirectories(@Body() dto: BrowseDirectoriesDto) {
    return this.settingsService.browseDirectories(dto.path);
  }

  @Post('validate-storage-path')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate storage path',
    description:
      'Validates a storage path for metadata (checks permissions, space, etc.) (admin only)',
  })
  @ApiBody({
    description: 'Path to validate',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', example: '/app/uploads/metadata' },
      },
      required: ['path'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        writable: { type: 'boolean' },
        exists: { type: 'boolean' },
        readOnly: { type: 'boolean' },
        spaceAvailable: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async validateStoragePath(@Body() dto: ValidateStoragePathDto) {
    return this.settingsService.validateStoragePath(dto.path);
  }

  @Get('federation/server-name')
  @ApiOperation({
    summary: 'Get federation server name',
    description:
      'Returns the server name for federation. Generates a random default name if not configured.',
  })
  @ApiResponse({
    status: 200,
    description: 'Server name retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Echo Server #1234' },
        isDefault: { type: 'boolean', description: 'True if the name was just auto-generated' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getFederationServerName() {
    let serverName = await this.settingsService.getString('server.name', '');
    let isDefault = false;

    if (!serverName) {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      serverName = `Echo Server #${randomId}`;
      await this.settingsService.set('server.name', serverName);
      isDefault = true;
      this.logger.info(`Generated default server name: ${serverName}`);
    }

    return { name: serverName, isDefault };
  }

  @Get('federation/server-color')
  @ApiOperation({
    summary: 'Get federation server color',
    description: 'Returns the server color for federation identification.',
  })
  @ApiResponse({
    status: 200,
    description: 'Server color retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        color: { type: 'string', example: 'purple' },
      },
    },
  })
  async getFederationServerColor() {
    const serverColor = await this.settingsService.getString('server.color', '');
    return { color: serverColor || 'purple' };
  }

  @Post('cache/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear settings cache',
    description: 'Clears the in-memory settings cache (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache cleared successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async clearCache() {
    this.settingsService.clearCache();
    this.logger.info('Settings cache cleared');
    return { success: true, message: 'Cache cleared successfully' };
  }

  @Post('agents/reload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reload all metadata agents',
    description:
      'Reloads settings for all external metadata agents (Fanart.tv, Last.fm). Use this after updating API keys.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agents reloaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        agents: {
          type: 'object',
          properties: {
            fanart: { type: 'object', properties: { enabled: { type: 'boolean' } } },
            lastfm: { type: 'object', properties: { enabled: { type: 'boolean' } } },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async reloadAgents() {
    this.settingsService.clearCache();

    await this.fanartAgent.loadSettings();
    await this.lastfmAgent.loadSettings();

    const fanartEnabled = this.fanartAgent.isEnabled();
    const lastfmEnabled = this.lastfmAgent.isEnabled();

    this.logger.info(`Agents reloaded - Fanart.tv: ${fanartEnabled}, Last.fm: ${lastfmEnabled}`);

    return {
      success: true,
      message: 'All metadata agents reloaded successfully',
      agents: {
        fanart: { enabled: fanartEnabled },
        lastfm: { enabled: lastfmEnabled },
      },
    };
  }

  @Post('enrichment/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset enrichment state',
    description:
      'Resets enrichment state for artists/albums that were marked as processed but have no external data. ' +
      'Use this after configuring API keys to re-process items that were skipped.',
  })
  @ApiBody({
    description: 'Reset options',
    schema: {
      type: 'object',
      properties: {
        resetArtists: {
          type: 'boolean',
          default: true,
          description: 'Reset artist enrichment state',
        },
        resetAlbums: {
          type: 'boolean',
          default: true,
          description: 'Reset album enrichment state',
        },
        onlyWithoutExternalData: {
          type: 'boolean',
          default: true,
          description: 'Only reset items that have no external data (recommended)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Enrichment state reset successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        artistsReset: { type: 'number' },
        albumsReset: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async resetEnrichmentState(
    @Body()
    options: {
      resetArtists?: boolean;
      resetAlbums?: boolean;
      onlyWithoutExternalData?: boolean;
    } = {}
  ) {
    this.logger.info('Resetting enrichment state...');

    const result = await this.enrichmentQueueService.resetEnrichmentState({
      resetArtists: options.resetArtists ?? true,
      resetAlbums: options.resetAlbums ?? true,
      onlyWithoutExternalData: options.onlyWithoutExternalData ?? true,
    });

    const totalReset = result.artistsReset + result.albumsReset;

    this.logger.info(
      `Enrichment state reset: ${result.artistsReset} artists, ${result.albumsReset} albums`
    );

    return {
      success: true,
      message:
        totalReset > 0
          ? `Reset enrichment state for ${totalReset} items. They will be re-processed in the next enrichment run.`
          : 'No items needed to be reset (all items either have external data or were never processed).',
      artistsReset: result.artistsReset,
      albumsReset: result.albumsReset,
    };
  }

  @Post('enrichment/reset-and-start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset enrichment state and start queue',
    description:
      'Resets enrichment state for items without external data and starts the enrichment queue. ' +
      'Useful after configuring API keys for the first time.',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrichment reset and queue started',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        artistsReset: { type: 'number' },
        albumsReset: { type: 'number' },
        queueStarted: { type: 'boolean' },
        pendingItems: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async resetAndStartEnrichment() {
    this.logger.info('Resetting enrichment state and starting queue...');

    const resetResult = await this.enrichmentQueueService.resetEnrichmentState({
      resetArtists: true,
      resetAlbums: true,
      onlyWithoutExternalData: true,
    });

    const queueResult = await this.enrichmentQueueService.startEnrichmentQueue();

    this.logger.info(
      `Reset ${resetResult.artistsReset} artists, ${resetResult.albumsReset} albums. ` +
        `Queue started: ${queueResult.started}, pending: ${queueResult.pending}`
    );

    return {
      success: true,
      message: queueResult.started
        ? `Reset ${resetResult.artistsReset + resetResult.albumsReset} items. Enrichment queue started with ${queueResult.pending} items.`
        : `Reset ${resetResult.artistsReset + resetResult.albumsReset} items. ${queueResult.message}`,
      artistsReset: resetResult.artistsReset,
      albumsReset: resetResult.albumsReset,
      queueStarted: queueResult.started,
      pendingItems: queueResult.pending,
    };
  }
}
