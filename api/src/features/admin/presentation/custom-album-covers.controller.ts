import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { UploadCustomAlbumCoverUseCase } from '../infrastructure/use-cases/upload-custom-album-cover';
import { ListCustomAlbumCoversUseCase } from '../infrastructure/use-cases/list-custom-album-covers';
import { DeleteCustomAlbumCoverUseCase } from '../infrastructure/use-cases/delete-custom-album-cover';
import { ApplyCustomAlbumCoverUseCase } from '../infrastructure/use-cases/apply-custom-album-cover';

@ApiTags('Admin - Custom Album Covers')
@ApiBearerAuth()
@Controller('admin/metadata/album/custom-covers')
@UseGuards(JwtAuthGuard, AdminGuard)
export class CustomAlbumCoversController {
  constructor(
    private readonly uploadCustomCover: UploadCustomAlbumCoverUseCase,
    private readonly listCustomCovers: ListCustomAlbumCoversUseCase,
    private readonly deleteCustomCover: DeleteCustomAlbumCoverUseCase,
    private readonly applyCustomCover: ApplyCustomAlbumCoverUseCase,
  ) {}

  @Get(':albumId')
  @ApiOperation({
    summary: 'List custom covers for an album',
    description: 'Get all custom uploaded covers for a specific album',
  })
  async listCovers(@Param('albumId') albumId: string) {
    return await this.listCustomCovers.execute({ albumId });
  }

  @Post(':albumId/upload')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload custom album cover',
    description: 'Upload a custom cover for an album',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Cover image file (JPEG, PNG, or WebP)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cover uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        customCoverId: { type: 'string' },
        filePath: { type: 'string' },
        url: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file (size, type, or missing)',
  })
  async uploadCover(
    @Param('albumId', ParseUUIDPipe) albumId: string,
    @Req() request: FastifyRequest & { file: () => Promise<MultipartFile> } & { user: any },
  ) {
    // Fastify multipart - get uploaded file
    const data = await request.file();

    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024;

    // Convert stream to buffer
    const buffer = await data.toBuffer();

    if (buffer.length > MAX_SIZE) {
      throw new BadRequestException('File size exceeds maximum allowed size of 10MB');
    }

    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(data.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    return await this.uploadCustomCover.execute({
      albumId,
      file: {
        buffer,
        mimetype: data.mimetype,
        size: buffer.length,
        originalname: data.filename,
      },
      uploadedBy: request.user.id,
    });
  }

  @Post(':albumId/apply/:customCoverId')
  @ApiOperation({
    summary: 'Apply custom cover',
    description: 'Set a custom cover as the active cover for the album',
  })
  async applyCover(
    @Param('albumId', ParseUUIDPipe) albumId: string,
    @Param('customCoverId', ParseUUIDPipe) customCoverId: string,
  ) {
    return await this.applyCustomCover.execute({
      albumId,
      customCoverId,
    });
  }

  @Delete(':albumId/:customCoverId')
  @ApiOperation({
    summary: 'Delete custom cover',
    description: 'Delete a custom uploaded cover',
  })
  async deleteCover(
    @Param('albumId', ParseUUIDPipe) albumId: string,
    @Param('customCoverId', ParseUUIDPipe) customCoverId: string,
  ) {
    return await this.deleteCustomCover.execute({
      albumId,
      customCoverId,
    });
  }
}
