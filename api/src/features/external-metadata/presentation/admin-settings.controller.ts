import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
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
    private readonly lastfmAgent: LastfmAgent,
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
    try {
      const settings = await this.settingsService.findAll();

      this.logger.debug(`Retrieved ${settings.length} settings`);

      return settings;
    } catch (error) {
      this.logger.error(`Error retrieving settings: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
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
    try {
      const settings = await this.settingsService.findByCategory(category);

      this.logger.debug(`Retrieved ${settings.length} settings for category ${category}`);

      return settings;
    } catch (error) {
      this.logger.error(
        `Error retrieving settings for category ${category}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @Get(':key')
  @ApiOperation({
    summary: 'Get specific setting',
    description: 'Returns a specific configuration setting by key (admin only). Returns null if not found.',
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
    try {
      const setting = await this.settingsService.findOne(key);

      if (!setting) {
        this.logger.debug(`Setting ${key} not found, returning null`);
        return null;
      }

      this.logger.debug(`Retrieved setting: ${key}`);

      return setting;
    } catch (error) {
      this.logger.error(`Error retrieving setting ${key}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
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
    try {
      // Obtener valor actual (puede no existir)
      const currentSetting = await this.settingsService.findOne(key);
      const oldValue = currentSetting?.value ?? null;
      const isCreating = !currentSetting;

      // Usar set() que hace upsert (crea si no existe)
      await this.settingsService.set(key, dto.value);

      if (isCreating) {
        this.logger.info(`Setting ${key} created with value "${dto.value}"`);
      } else {
        this.logger.info(`Setting ${key} updated from "${oldValue}" to "${dto.value}"`);
      }

      // Invalidar caché
      this.settingsService.clearCache();

      // Reload agents if API key was updated
      await this.reloadAgentsIfNeeded(key);

      return {
        success: true,
        key,
        oldValue,
        newValue: dto.value,
        created: isCreating,
      };
    } catch (error) {
      this.logger.error(`Error updating setting ${key}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  // Recarga agentes si se actualiza su API key y resetea items sin datos
  private async reloadAgentsIfNeeded(key: string): Promise<void> {
    // Track which agents were enabled before reload
    const fanartWasEnabled = this.fanartAgent.isEnabled();
    const lastfmWasEnabled = this.lastfmAgent.isEnabled();

    let agentBecameEnabled = false;

    if (key.includes('fanart')) {
      this.logger.info('Reloading Fanart.tv agent settings...');
      await this.fanartAgent.loadSettings();
      const fanartNowEnabled = this.fanartAgent.isEnabled();
      this.logger.info(`Fanart.tv agent reloaded (enabled: ${fanartNowEnabled})`);

      // Check if agent was just enabled (wasn't enabled before, now is)
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

      // Check if agent was just enabled
      if (!lastfmWasEnabled && lastfmNowEnabled) {
        agentBecameEnabled = true;
        this.logger.info('Last.fm agent was just enabled!');
      }
    }

    // If an agent was just enabled, reset enrichment state for items without external data
    // This allows re-processing items that were skipped when no API keys were configured
    if (agentBecameEnabled) {
      this.logger.info('Agent enabled - resetting enrichment state for items without external data...');
      try {
        const resetResult = await this.enrichmentQueueService.resetEnrichmentState({
          resetArtists: true,
          resetAlbums: true,
          onlyWithoutExternalData: true, // Only reset items that have no external data
        });
        this.logger.info(
          `Enrichment state reset: ${resetResult.artistsReset} artists, ${resetResult.albumsReset} albums ` +
          `are now ready for re-processing`,
        );
      } catch (error) {
        this.logger.warn(`Failed to reset enrichment state: ${(error as Error).message}`);
        // Don't throw - this is a nice-to-have, not critical
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
    try {
      if (!dto.service || !dto.apiKey) {
        throw new BadRequestException('Service and apiKey are required');
      }

      if (!['lastfm', 'fanart'].includes(dto.service)) {
        throw new BadRequestException('Service must be "lastfm" or "fanart"');
      }

      this.logger.info(`Validating API key for ${dto.service}`);

      const isValid = await this.settingsService.validateApiKey(dto.service, dto.apiKey);

      if (isValid) {
        return {
          valid: true,
          service: dto.service,
          message: 'API key is valid',
        };
      } else {
        return {
          valid: false,
          service: dto.service,
          message: 'API key is invalid or service is unavailable',
        };
      }
    } catch (error) {
      this.logger.error(
        `Error validating API key for ${dto.service}: ${(error as Error).message}`,
        (error as Error).stack,
      );

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
    description:
      'Deletes a configuration setting, resetting it to default value (admin only)',
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
    try {
      const setting = await this.settingsService.findOne(key);

      if (!setting) {
        throw new BadRequestException(`Setting with key ${key} not found`);
      }

      await this.settingsService.delete(key);

      this.logger.info(`Setting ${key} deleted (reset to default)`);

      // Invalidar caché
      this.settingsService.clearCache();

      return {
        success: true,
        key,
        message: 'Setting deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Error deleting setting ${key}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
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
    try {
      const result = await this.settingsService.browseDirectories(dto.path);
      this.logger.debug(`Browsed directory: ${dto.path}`);
      return result;
    } catch (error) {
      this.logger.error(`Error browsing directory ${dto.path}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  @Post('validate-storage-path')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate storage path',
    description: 'Validates a storage path for metadata (checks permissions, space, etc.) (admin only)',
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
    try {
      const result = await this.settingsService.validateStoragePath(dto.path);
      this.logger.debug(`Validated storage path: ${dto.path}`);
      return result;
    } catch (error) {
      this.logger.error(`Error validating path ${dto.path}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
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
    try {
      this.settingsService.clearCache();

      this.logger.info('Settings cache cleared');

      return {
        success: true,
        message: 'Cache cleared successfully',
      };
    } catch (error) {
      this.logger.error(`Error clearing cache: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  @Post('agents/reload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reload all metadata agents',
    description: 'Reloads settings for all external metadata agents (Fanart.tv, Last.fm). Use this after updating API keys.',
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
    try {
      // Clear settings cache first to pick up new values
      this.settingsService.clearCache();

      // Reload all agents
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
    } catch (error) {
      this.logger.error(`Error reloading agents: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  @Post('enrichment/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset enrichment state',
    description: 'Resets enrichment state for artists/albums that were marked as processed but have no external data. ' +
      'Use this after configuring API keys to re-process items that were skipped.',
  })
  @ApiBody({
    description: 'Reset options',
    schema: {
      type: 'object',
      properties: {
        resetArtists: { type: 'boolean', default: true, description: 'Reset artist enrichment state' },
        resetAlbums: { type: 'boolean', default: true, description: 'Reset album enrichment state' },
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
    @Body() options: {
      resetArtists?: boolean;
      resetAlbums?: boolean;
      onlyWithoutExternalData?: boolean;
    } = {},
  ) {
    try {
      this.logger.info('Resetting enrichment state...');

      const result = await this.enrichmentQueueService.resetEnrichmentState({
        resetArtists: options.resetArtists ?? true,
        resetAlbums: options.resetAlbums ?? true,
        onlyWithoutExternalData: options.onlyWithoutExternalData ?? true,
      });

      const totalReset = result.artistsReset + result.albumsReset;

      this.logger.info(
        `Enrichment state reset: ${result.artistsReset} artists, ${result.albumsReset} albums`,
      );

      return {
        success: true,
        message: totalReset > 0
          ? `Reset enrichment state for ${totalReset} items. They will be re-processed in the next enrichment run.`
          : 'No items needed to be reset (all items either have external data or were never processed).',
        artistsReset: result.artistsReset,
        albumsReset: result.albumsReset,
      };
    } catch (error) {
      this.logger.error(`Error resetting enrichment state: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  @Post('enrichment/reset-and-start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset enrichment state and start queue',
    description: 'Resets enrichment state for items without external data and starts the enrichment queue. ' +
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
    try {
      this.logger.info('Resetting enrichment state and starting queue...');

      // First, reset enrichment state
      const resetResult = await this.enrichmentQueueService.resetEnrichmentState({
        resetArtists: true,
        resetAlbums: true,
        onlyWithoutExternalData: true,
      });

      // Then, start the enrichment queue
      const queueResult = await this.enrichmentQueueService.startEnrichmentQueue();

      this.logger.info(
        `Reset ${resetResult.artistsReset} artists, ${resetResult.albumsReset} albums. ` +
        `Queue started: ${queueResult.started}, pending: ${queueResult.pending}`,
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
    } catch (error) {
      this.logger.error(`Error in reset and start: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}
