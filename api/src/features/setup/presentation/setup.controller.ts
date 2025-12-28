import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { IsString, MinLength } from 'class-validator';
import { SetupService } from '../application/setup.service';
import { Public } from '@shared/decorators/public.decorator';

/**
 * DTO for creating admin account
 */
class CreateAdminDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

/**
 * DTO for configuring music library
 */
class ConfigureLibraryDto {
  @IsString()
  path!: string;
}

/**
 * DTO for browsing directories
 */
class BrowseDirectoriesDto {
  @IsString()
  path!: string;
}

/**
 * Setup Controller
 *
 * Handles first-run setup wizard (Jellyfin-style).
 * All endpoints are PUBLIC (no auth required) but only work
 * when setup is not completed.
 *
 * Flow:
 * 1. GET /setup/status - Check if setup needed
 * 2. POST /setup/admin - Create admin account
 * 3. POST /setup/library - Configure music library
 * 4. POST /setup/complete - Finish setup
 */
@ApiTags('setup')
@Controller('setup')
@Public()
export class SetupController {
  constructor(
    @InjectPinoLogger(SetupController.name)
    private readonly logger: PinoLogger,
    private readonly setupService: SetupService,
  ) {}

  /**
   * Get setup status
   * Returns whether setup is needed and current progress
   */
  @Get('status')
  @ApiOperation({
    summary: 'Get setup status',
    description: 'Check if first-run setup is needed and current progress',
  })
  @ApiResponse({
    status: 200,
    description: 'Setup status retrieved',
    schema: {
      type: 'object',
      properties: {
        needsSetup: { type: 'boolean', description: 'True if setup wizard should be shown' },
        hasAdmin: { type: 'boolean', description: 'True if admin user exists' },
        hasMusicLibrary: { type: 'boolean', description: 'True if music library is configured' },
        musicLibraryPath: { type: 'string', nullable: true, description: 'Current music library path' },
        setupCompleted: { type: 'boolean', description: 'True if setup was completed' },
      },
    },
  })
  async getStatus() {
    return this.setupService.getStatus();
  }

  /**
   * Create admin account (Step 1)
   */
  @Post('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create admin account',
    description: 'Create the first admin account (only works during setup)',
  })
  @ApiBody({
    description: 'Admin account details',
    schema: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string', minLength: 3, example: 'admin' },
        password: { type: 'string', minLength: 8, example: 'securepassword123' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Admin account created successfully' })
  @ApiResponse({ status: 400, description: 'Setup already completed or validation error' })
  async createAdmin(@Body() dto: CreateAdminDto) {
    await this.setupService.createAdmin(dto.username, dto.password);

    this.logger.info(`Admin account created via setup wizard: ${dto.username}`);

    return {
      success: true,
      message: 'Admin account created successfully',
      username: dto.username,
    };
  }

  /**
   * Configure music library (Step 2)
   */
  @Post('library')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Configure music library',
    description: 'Set the path to your music collection (only works during setup)',
  })
  @ApiBody({
    description: 'Music library path',
    schema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: { type: 'string', example: '/mnt/music' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Library configuration result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        message: { type: 'string' },
        fileCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Setup already completed or invalid path' })
  async configureLibrary(@Body() dto: ConfigureLibraryDto) {
    const result = await this.setupService.configureMusicLibrary(dto.path);

    this.logger.info(`Music library validation: ${dto.path} - ${result.valid ? 'valid' : 'invalid'}`);

    return result;
  }

  /**
   * Browse directories for library selection
   */
  @Post('browse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Browse directories',
    description: 'Browse server directories to select music library path',
  })
  @ApiBody({
    description: 'Directory to browse',
    schema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: { type: 'string', example: '/mnt' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Directory listing',
    schema: {
      type: 'object',
      properties: {
        currentPath: { type: 'string' },
        parentPath: { type: 'string', nullable: true },
        canGoUp: { type: 'boolean' },
        directories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              path: { type: 'string' },
              readable: { type: 'boolean' },
              hasMusic: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  async browseDirectories(@Body() dto: BrowseDirectoriesDto) {
    return this.setupService.browseDirectories(dto.path);
  }

  /**
   * Complete setup (Step 3)
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete setup',
    description: 'Mark setup as complete and enable normal operation',
  })
  @ApiResponse({
    status: 200,
    description: 'Setup completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Setup requirements not met' })
  async completeSetup() {
    const result = await this.setupService.completeSetup();

    this.logger.info('Setup wizard completed');

    return result;
  }
}
