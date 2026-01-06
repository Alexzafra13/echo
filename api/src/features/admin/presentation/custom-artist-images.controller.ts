import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
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
import { UploadCustomArtistImageUseCase } from '../infrastructure/use-cases/upload-custom-artist-image';
import { ListCustomArtistImagesUseCase } from '../infrastructure/use-cases/list-custom-artist-images';
import { DeleteCustomArtistImageUseCase } from '../infrastructure/use-cases/delete-custom-artist-image';
import { ApplyCustomArtistImageUseCase } from '../infrastructure/use-cases/apply-custom-artist-image';

@ApiTags('Admin - Custom Artist Images')
@ApiBearerAuth()
@Controller('admin/metadata/artist/custom-images')
@UseGuards(JwtAuthGuard, AdminGuard)
export class CustomArtistImagesController {
  constructor(
    private readonly uploadCustomImage: UploadCustomArtistImageUseCase,
    private readonly listCustomImages: ListCustomArtistImagesUseCase,
    private readonly deleteCustomImage: DeleteCustomArtistImageUseCase,
    private readonly applyCustomImage: ApplyCustomArtistImageUseCase,
  ) {}

  @Get(':artistId')
  @ApiOperation({
    summary: 'List custom images for an artist',
    description: 'Get all custom uploaded images for a specific artist',
  })
  async listImages(@Param('artistId') artistId: string) {
    return await this.listCustomImages.execute({ artistId });
  }

  @Post(':artistId/upload')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload custom artist image',
    description: 'Upload a custom image for an artist (profile, background, banner, or logo)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, or WebP)',
        },
        imageType: {
          type: 'string',
          enum: ['profile', 'background', 'banner', 'logo'],
          description: 'Type of image to upload',
        },
      },
      required: ['file', 'imageType'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        customImageId: { type: 'string' },
        filePath: { type: 'string' },
        url: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file (size, type, or missing)',
  })
  async uploadImage(
    @Param('artistId', ParseUUIDPipe) artistId: string,
    @Req() request: FastifyRequest & { file: () => Promise<MultipartFile> } & { user: any },
  ) {
    // Fastify multipart - get uploaded file
    const data = await request.file();

    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file size (10MB max for custom images)
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

    // Get imageType from fields with proper type checking
    const fields = data.fields as Record<string, { value: string }>;
    const imageType = fields.imageType?.value;

    if (!imageType) {
      throw new BadRequestException('imageType field is required');
    }

    const validImageTypes = ['profile', 'background', 'banner', 'logo'];
    if (!validImageTypes.includes(imageType)) {
      throw new BadRequestException(
        `Invalid imageType. Allowed values: ${validImageTypes.join(', ')}`,
      );
    }

    return await this.uploadCustomImage.execute({
      artistId,
      imageType: imageType as 'profile' | 'background' | 'banner' | 'logo',
      file: {
        buffer,
        mimetype: data.mimetype,
        size: buffer.length,
        originalname: data.filename,
      },
      uploadedBy: request.user.id,
    });
  }

  @Post(':artistId/apply/:customImageId')
  @ApiOperation({
    summary: 'Apply custom image',
    description: 'Set a custom image as the active image for the artist',
  })
  async applyImage(
    @Param('artistId', ParseUUIDPipe) artistId: string,
    @Param('customImageId', ParseUUIDPipe) customImageId: string,
  ) {
    return await this.applyCustomImage.execute({
      artistId,
      customImageId,
    });
  }

  @Delete(':artistId/:customImageId')
  @ApiOperation({
    summary: 'Delete custom image',
    description: 'Delete a custom uploaded image',
  })
  async deleteImage(
    @Param('artistId', ParseUUIDPipe) artistId: string,
    @Param('customImageId', ParseUUIDPipe) customImageId: string,
  ) {
    return await this.deleteCustomImage.execute({
      artistId,
      customImageId,
    });
  }
}
