import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { UploadRadioFaviconUseCase } from '../infrastructure/use-cases/upload-radio-favicon';
import { DeleteRadioFaviconUseCase } from '../infrastructure/use-cases/delete-radio-favicon';
import { RadioFaviconFetchService } from '@features/radio/infrastructure/services/radio-favicon-fetch.service';

@ApiTags('Admin - Radio Favicons')
@ApiBearerAuth()
@Controller('admin/radio/favicons')
@UseGuards(JwtAuthGuard, AdminGuard)
export class RadioFaviconsController {
  constructor(
    private readonly uploadFavicon: UploadRadioFaviconUseCase,
    private readonly deleteFavicon: DeleteRadioFaviconUseCase,
    private readonly faviconFetch: RadioFaviconFetchService
  ) {}

  @Post(':stationUuid/upload')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload custom favicon for radio station',
    description:
      'Upload a custom favicon image for a radio station (admin only, global for all users)',
  })
  @ApiParam({ name: 'stationUuid', description: 'Radio Browser station UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, or WebP, max 10MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, description: 'Favicon uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async upload(
    @Param('stationUuid') stationUuid: string,
    @Req()
    request: FastifyRequest & { file: () => Promise<MultipartFile> } & { user: { id: string } }
  ) {
    const data = await request.file();

    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    const buffer = await data.toBuffer();

    if (buffer.length > MAX_SIZE) {
      throw new BadRequestException('File exceeds maximum size of 10MB');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(data.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
      );
    }

    return await this.uploadFavicon.execute({
      stationUuid,
      file: {
        buffer,
        mimetype: data.mimetype,
        size: buffer.length,
        originalname: data.filename,
      },
      uploadedBy: request.user.id,
    });
  }

  @Delete(':stationUuid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete custom favicon for radio station',
    description: 'Remove the custom favicon, reverting to the original source',
  })
  @ApiParam({ name: 'stationUuid', description: 'Radio Browser station UUID' })
  @ApiResponse({ status: 200, description: 'Favicon deleted successfully' })
  @ApiResponse({ status: 404, description: 'No custom favicon found' })
  async remove(@Param('stationUuid') stationUuid: string) {
    return await this.deleteFavicon.execute({ stationUuid });
  }

  @Post(':stationUuid/auto-fetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Auto-fetch favicon from external sources',
    description:
      'Try to automatically find and download a favicon from apple-touch-icon, Google Favicon API, or Wikipedia',
  })
  @ApiParam({ name: 'stationUuid', description: 'Radio Browser station UUID' })
  @ApiResponse({ status: 200, description: 'Auto-fetch result' })
  async autoFetch(
    @Param('stationUuid') stationUuid: string,
    @Query('name') name: string,
    @Query('homepage') homepage?: string
  ) {
    if (!name) {
      throw new BadRequestException('Station name is required (query param: name)');
    }

    return await this.faviconFetch.fetchAndSave(stationUuid, name, homepage);
  }

  @Post(':stationUuid/previews')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch favicon previews from all sources',
    description:
      'Fetch favicon images from all available sources (apple-touch-icon, Google, Wikipedia) and return them as base64 previews for the admin to choose',
  })
  @ApiParam({ name: 'stationUuid', description: 'Radio Browser station UUID' })
  @ApiResponse({ status: 200, description: 'Preview images from all sources' })
  async fetchPreviews(
    @Param('stationUuid') _stationUuid: string,
    @Query('name') name: string,
    @Query('homepage') homepage?: string
  ) {
    if (!name) {
      throw new BadRequestException('Station name is required (query param: name)');
    }

    return await this.faviconFetch.fetchPreviews(name, homepage);
  }

  @Post(':stationUuid/save-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save a selected preview image as the station favicon',
    description: 'Save a previously fetched preview image (base64 data URL) as the station favicon',
  })
  @ApiParam({ name: 'stationUuid', description: 'Radio Browser station UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        dataUrl: { type: 'string', description: 'Base64 data URL of the selected image' },
        source: {
          type: 'string',
          description: 'Source identifier (apple-touch-icon, google-favicon, wikipedia)',
        },
        stationName: { type: 'string', description: 'Station name for enrichment logging' },
      },
      required: ['dataUrl', 'source'],
    },
  })
  @ApiResponse({ status: 200, description: 'Favicon saved successfully' })
  async savePreview(
    @Param('stationUuid') stationUuid: string,
    @Body() body: { dataUrl: string; source: string; stationName?: string }
  ) {
    if (!body.dataUrl || !body.source) {
      throw new BadRequestException('dataUrl and source are required');
    }

    return await this.faviconFetch.saveFromDataUrl(
      stationUuid,
      body.dataUrl,
      body.source,
      body.stationName
    );
  }
}
