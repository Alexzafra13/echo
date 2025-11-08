import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  Logger,
  UseGuards,
  Header,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { createReadStream } from 'fs';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { Public } from '@shared/decorators/public.decorator';
import { ImageService, ArtistImageType } from '../application/services/image.service';
import { ArtistImagesDto, ImageMetadataDto } from './dtos/artist-images.dto';

/**
 * Images Controller
 * HTTP endpoints for serving locally stored images from external metadata
 *
 * Endpoints:
 * - GET /api/images/artists/:artistId/:imageType - Serve artist image
 * - GET /api/images/albums/:albumId/cover - Serve album cover
 *
 * Features:
 * - Streaming de archivos para eficiencia
 * - Cache headers (ETag, Last-Modified, Cache-Control)
 * - Soporte para HTTP 304 Not Modified
 * - Validación de tipos de imagen
 */
@ApiTags('images')
@Controller('images')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ImagesController {
  private readonly logger = new Logger(ImagesController.name);

  constructor(private readonly imageService: ImageService) {}

  /**
   * Sirve una imagen de artista
   * GET /api/images/artists/:artistId/:imageType
   *
   * imageType puede ser:
   * - profile-small: Imagen de perfil pequeña (250x250)
   * - profile-medium: Imagen de perfil mediana (500x500)
   * - profile-large: Imagen de perfil grande (1000x1000)
   * - background: Imagen de fondo HD (1920x1080+)
   * - banner: Banner del artista (1000x185+)
   * - logo: Logo del artista con transparencia
   */
  @Public()
  @Get('artists/:artistId/:imageType')
  @ApiOperation({
    summary: 'Serve artist image',
    description:
      'Returns an artist image file with appropriate cache headers. Supports profile, background, banner, and logo images.',
  })
  @ApiParam({
    name: 'artistId',
    description: 'Artist UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'imageType',
    description: 'Type of image to retrieve',
    enum: [
      'profile-small',
      'profile-medium',
      'profile-large',
      'background',
      'banner',
      'logo',
    ],
    example: 'profile-medium',
  })
  @ApiResponse({
    status: 200,
    description: 'Image file returned successfully',
    content: {
      'image/jpeg': {},
      'image/png': {},
      'image/webp': {},
    },
  })
  @ApiResponse({ status: 404, description: 'Artist or image not found' })
  @ApiResponse({ status: 304, description: 'Not Modified (cached)' })
  async getArtistImage(
    @Param('artistId') artistId: string,
    @Param('imageType') imageType: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<StreamableFile> {
    // Validar tipo de imagen
    const validImageTypes: ArtistImageType[] = [
      'profile-small',
      'profile-medium',
      'profile-large',
      'background',
      'banner',
      'logo',
    ];

    if (!validImageTypes.includes(imageType as ArtistImageType)) {
      throw new NotFoundException(
        `Invalid image type. Valid types: ${validImageTypes.join(', ')}`,
      );
    }

    try {
      // Obtener información de la imagen
      const imageResult = await this.imageService.getArtistImage(
        artistId,
        imageType as ArtistImageType,
      );

      // Configurar headers de caché
      this.setCacheHeaders(res, imageResult.lastModified, imageResult.mimeType);

      // Crear stream del archivo
      const fileStream = createReadStream(imageResult.filePath);

      this.logger.debug(
        `Serving artist image: ${artistId} - ${imageType} (${imageResult.size} bytes)`,
      );

      return new StreamableFile(fileStream);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error serving artist image ${artistId}/${imageType}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new NotFoundException(
        `Unable to serve image for artist ${artistId}`,
      );
    }
  }

  /**
   * Sirve la portada de un álbum
   * GET /api/images/albums/:albumId/cover
   */
  @Public()
  @Get('albums/:albumId/cover')
  @ApiOperation({
    summary: 'Serve album cover',
    description:
      'Returns an album cover image file with appropriate cache headers.',
  })
  @ApiParam({
    name: 'albumId',
    description: 'Album UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Cover image returned successfully',
    content: {
      'image/jpeg': {},
      'image/png': {},
      'image/webp': {},
    },
  })
  @ApiResponse({ status: 404, description: 'Album or cover not found' })
  @ApiResponse({ status: 304, description: 'Not Modified (cached)' })
  async getAlbumCover(
    @Param('albumId') albumId: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<StreamableFile> {
    try {
      // Obtener información de la portada
      const imageResult = await this.imageService.getAlbumCover(albumId);

      // Configurar headers de caché
      this.setCacheHeaders(res, imageResult.lastModified, imageResult.mimeType);

      // Crear stream del archivo
      const fileStream = createReadStream(imageResult.filePath);

      this.logger.debug(
        `Serving album cover: ${albumId} (${imageResult.size} bytes)`,
      );

      return new StreamableFile(fileStream);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error serving album cover ${albumId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new NotFoundException(`Unable to serve cover for album ${albumId}`);
    }
  }

  /**
   * Verifica si un artista tiene una imagen específica
   * GET /api/images/artists/:artistId/:imageType/exists
   */
  @Get('artists/:artistId/:imageType/exists')
  @ApiOperation({
    summary: 'Check if artist image exists',
    description: 'Returns a boolean indicating if the image exists',
  })
  @ApiResponse({
    status: 200,
    description: 'Check result',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
        artistId: { type: 'string' },
        imageType: { type: 'string' },
      },
    },
  })
  async checkArtistImage(
    @Param('artistId') artistId: string,
    @Param('imageType') imageType: string,
  ) {
    // Validar tipo de imagen
    const validImageTypes: ArtistImageType[] = [
      'profile-small',
      'profile-medium',
      'profile-large',
      'background',
      'banner',
      'logo',
    ];

    if (!validImageTypes.includes(imageType as ArtistImageType)) {
      return {
        exists: false,
        artistId,
        imageType,
        error: 'Invalid image type',
      };
    }

    const exists = await this.imageService.hasArtistImage(
      artistId,
      imageType as ArtistImageType,
    );

    return {
      exists,
      artistId,
      imageType,
    };
  }

  /**
   * Verifica si un álbum tiene portada
   * GET /api/images/albums/:albumId/cover/exists
   */
  @Get('albums/:albumId/cover/exists')
  @ApiOperation({
    summary: 'Check if album cover exists',
    description: 'Returns a boolean indicating if the cover exists',
  })
  @ApiResponse({
    status: 200,
    description: 'Check result',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
        albumId: { type: 'string' },
      },
    },
  })
  async checkAlbumCover(@Param('albumId') albumId: string) {
    const exists = await this.imageService.hasAlbumCover(albumId);

    return {
      exists,
      albumId,
    };
  }

  /**
   * Sirve el avatar de un usuario
   * GET /api/images/users/:userId/avatar
   */
  @Public()
  @Get('users/:userId/avatar')
  @ApiOperation({
    summary: 'Serve user avatar',
    description:
      'Returns a user avatar image file with appropriate cache headers.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar image returned successfully',
    content: {
      'image/jpeg': {},
      'image/png': {},
      'image/webp': {},
    },
  })
  @ApiResponse({ status: 404, description: 'User or avatar not found' })
  @ApiResponse({ status: 304, description: 'Not Modified (cached)' })
  async getUserAvatar(
    @Param('userId') userId: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<StreamableFile> {
    try {
      // Obtener información del avatar
      const imageResult = await this.imageService.getUserAvatar(userId);

      // Configurar headers de caché
      this.setCacheHeaders(res, imageResult.lastModified, imageResult.mimeType);

      // Crear stream del archivo
      const fileStream = createReadStream(imageResult.filePath);

      this.logger.debug(
        `Serving user avatar: ${userId} (${imageResult.size} bytes)`,
      );

      return new StreamableFile(fileStream);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error serving user avatar ${userId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new NotFoundException(`Unable to serve avatar for user ${userId}`);
    }
  }

  /**
   * Obtiene todas las imágenes disponibles de un artista
   * GET /api/images/artists/:artistId/all
   */
  @Get('artists/:artistId/all')
  @ApiOperation({
    summary: 'Get all available artist images',
    description:
      'Returns metadata for all available images of an artist (without downloading)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available images',
    schema: {
      type: 'object',
      properties: {
        artistId: { type: 'string' },
        images: {
          type: 'object',
          properties: {
            profileSmall: {
              type: 'object',
              properties: {
                exists: { type: 'boolean' },
                size: { type: 'number' },
                mimeType: { type: 'string' },
                lastModified: { type: 'string' },
              },
            },
            profileMedium: { type: 'object' },
            profileLarge: { type: 'object' },
            background: { type: 'object' },
            banner: { type: 'object' },
            logo: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  async getArtistImages(@Param('artistId') artistId: string): Promise<ArtistImagesDto> {
    const images = await this.imageService.getArtistImages(artistId);

    // Transform ImageResult objects to ImageMetadataDto format
    const transformedImages: ArtistImagesDto['images'] = {};

    if (images.profileSmall) {
      transformedImages.profileSmall = {
        exists: true,
        size: images.profileSmall.size,
        mimeType: images.profileSmall.mimeType,
        lastModified: images.profileSmall.lastModified.toISOString(),
      };
    }

    if (images.profileMedium) {
      transformedImages.profileMedium = {
        exists: true,
        size: images.profileMedium.size,
        mimeType: images.profileMedium.mimeType,
        lastModified: images.profileMedium.lastModified.toISOString(),
      };
    }

    if (images.profileLarge) {
      transformedImages.profileLarge = {
        exists: true,
        size: images.profileLarge.size,
        mimeType: images.profileLarge.mimeType,
        lastModified: images.profileLarge.lastModified.toISOString(),
      };
    }

    if (images.background) {
      transformedImages.background = {
        exists: true,
        size: images.background.size,
        mimeType: images.background.mimeType,
        lastModified: images.background.lastModified.toISOString(),
      };
    }

    if (images.banner) {
      transformedImages.banner = {
        exists: true,
        size: images.banner.size,
        mimeType: images.banner.mimeType,
        lastModified: images.banner.lastModified.toISOString(),
      };
    }

    if (images.logo) {
      transformedImages.logo = {
        exists: true,
        size: images.logo.size,
        mimeType: images.logo.mimeType,
        lastModified: images.logo.lastModified.toISOString(),
      };
    }

    return {
      artistId,
      images: transformedImages,
    };
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  /**
   * Configura headers de caché para la respuesta
   */
  private setCacheHeaders(
    res: FastifyReply,
    lastModified: Date,
    mimeType: string,
  ): void {
    // Content-Type
    res.header('Content-Type', mimeType);

    // Last-Modified
    res.header('Last-Modified', lastModified.toUTCString());

    // ETag basado en timestamp
    const etag = `"${lastModified.getTime()}"`;
    res.header('ETag', etag);

    // Cache-Control - cachear pero revalidar con ETag
    res.header('Cache-Control', 'public, max-age=3600, must-revalidate');

    // Permitir CORS
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  }
}
