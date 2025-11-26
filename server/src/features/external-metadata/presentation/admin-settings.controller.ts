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
  Logger,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
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
import { FanartTvAgent } from '../infrastructure/agents/fanart-tv.agent';
import { LastfmAgent } from '../infrastructure/agents/lastfm.agent';

/**
 * DTO para actualizar una configuración
 */
class UpdateSettingDto {
  @IsString()
  value!: string;
}

/**
 * DTO para validar API key
 */
class ValidateApiKeyDto {
  @IsIn(['lastfm', 'fanart'])
  service!: 'lastfm' | 'fanart';

  @IsString()
  apiKey!: string;
}

/**
 * DTO para navegar directorios
 */
class BrowseDirectoriesDto {
  @IsString()
  path!: string;
}

/**
 * DTO para validar ruta de almacenamiento
 */
class ValidateStoragePathDto {
  @IsString()
  path!: string;
}

/**
 * Admin Settings Controller
 * HTTP endpoints for managing external metadata settings (admin only)
 *
 * Endpoints:
 * - GET /api/admin/settings - Get all settings
 * - GET /api/admin/settings/category/:category - Get settings by category
 * - GET /api/admin/settings/:key - Get specific setting
 * - PUT /api/admin/settings/:key - Update setting
 * - POST /api/admin/settings/validate-api-key - Validate external API key
 * - DELETE /api/admin/settings/:key - Delete setting (reset to default)
 *
 * All endpoints require admin privileges
 */
@ApiTags('admin-settings')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminSettingsController {
  private readonly logger = new Logger(AdminSettingsController.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly fanartAgent: FanartTvAgent,
    private readonly lastfmAgent: LastfmAgent,
  ) {}

  /**
   * Obtiene todas las configuraciones
   * GET /api/admin/settings
   */
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

  /**
   * Obtiene configuraciones por categoría
   * GET /api/admin/settings/category/:category
   */
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

  /**
   * Obtiene una configuración específica
   * GET /api/admin/settings/:key
   */
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

  /**
   * Actualiza una configuración
   * PUT /api/admin/settings/:key
   */
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
        this.logger.log(`Setting ${key} created with value "${dto.value}"`);
      } else {
        this.logger.log(`Setting ${key} updated from "${oldValue}" to "${dto.value}"`);
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

  /**
   * Reload external metadata agents when their API keys are updated
   */
  private async reloadAgentsIfNeeded(key: string): Promise<void> {
    if (key.includes('fanart')) {
      this.logger.log('Reloading Fanart.tv agent settings...');
      await this.fanartAgent.loadSettings();
      this.logger.log(`Fanart.tv agent reloaded (enabled: ${this.fanartAgent.isEnabled()})`);
    }

    if (key.includes('lastfm')) {
      this.logger.log('Reloading Last.fm agent settings...');
      await this.lastfmAgent.loadSettings();
      this.logger.log(`Last.fm agent reloaded (enabled: ${this.lastfmAgent.isEnabled()})`);
    }
  }

  /**
   * Valida una API key de un servicio externo
   * POST /api/admin/settings/validate-api-key
   */
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

      this.logger.log(`Validating API key for ${dto.service}`);

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

  /**
   * Elimina una configuración (reset a default)
   * DELETE /api/admin/settings/:key
   */
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

      this.logger.log(`Setting ${key} deleted (reset to default)`);

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

  /**
   * Navega directorios del servidor
   * POST /api/admin/settings/browse-directories
   */
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

  /**
   * Valida una ruta de almacenamiento
   * POST /api/admin/settings/validate-storage-path
   */
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

  /**
   * Limpia el caché de configuraciones
   * POST /api/admin/settings/cache/clear
   */
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

      this.logger.log('Settings cache cleared');

      return {
        success: true,
        message: 'Cache cleared successfully',
      };
    } catch (error) {
      this.logger.error(`Error clearing cache: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}
