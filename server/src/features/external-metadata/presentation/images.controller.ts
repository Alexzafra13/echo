import {
  Controller,
  Get,
  Param,
  Query,
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
   * Sirve una imagen de artista con tag-based cache busting
   * GET /api/images/artists/:artistId/:imageType?tag={cacheTag}
   *
   * imageType puede ser:
   * - profile: Imagen de perfil del artista
   * - background: Imagen de fondo HD (1920x1080+)
   * - banner: Banner del artista (1000x185+)
   * - logo: Logo del artista con transparencia
   *
   * Query params:
   * - tag: Cache tag (MD5 hash). Si coincide con ETag, devuelve 304 Not Modified
   */
  @Public()
  @Get('artists/:artistId/:imageType')
  @ApiOperation({
    summary: 'Serve artist image',
    description:
      'Returns an artist image file with tag-based cache validation. Supports profile, background, banner, and logo images.',
  })
  @ApiParam({
    name: 'artistId',
    description: 'Artist UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'imageType',
    description: 'Type of image to retrieve',
    enum: ['profile', 'background', 'banner', 'logo'],
    example: 'profile',
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
  @ApiResponse({ status: 304, description: 'Not Modified (tag matches)' })
  async getArtistImage(
    @Param('artistId') artistId: string,
    @Param('imageType') imageType: string,
    @Query('tag') tag: string | undefined,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<StreamableFile | void> {
    // Validar tipo de imagen
    const validImageTypes: ArtistImageType[] = [
      'profile',
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

      // Si tag coincide, devolver 304 Not Modified
      if (tag && tag === imageResult.tag) {
        res.status(304);
        this.logger.debug(`304 Not Modified: ${artistId}/${imageType} (tag match)`);
        return;
      }

      // Configurar headers de caché con tag como ETag
      this.setCacheHeaders(res, imageResult);

      // Crear stream del archivo
      const fileStream = createReadStream(imageResult.filePath);

      this.logger.debug(
        `Serving ${imageResult.source.toUpperCase()} artist image: ${artistId} - ${imageType} (${imageResult.size} bytes, tag=${imageResult.tag})`,
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
      this.setCacheHeaders(res, imageResult);

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
      'profile',
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
      this.setCacheHeaders(res, imageResult);

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

    if (images.profile) {
      transformedImages.profile = {
        exists: true,
        size: images.profile.size,
        mimeType: images.profile.mimeType,
        lastModified: images.profile.lastModified.toISOString(),
        tag: images.profile.tag,
        source: images.profile.source,
      };
    }

    if (images.background) {
      transformedImages.background = {
        exists: true,
        size: images.background.size,
        mimeType: images.background.mimeType,
        lastModified: images.background.lastModified.toISOString(),
        tag: images.background.tag,
        source: images.background.source,
      };
    }

    if (images.banner) {
      transformedImages.banner = {
        exists: true,
        size: images.banner.size,
        mimeType: images.banner.mimeType,
        lastModified: images.banner.lastModified.toISOString(),
        tag: images.banner.tag,
        source: images.banner.source,
      };
    }

    if (images.logo) {
      transformedImages.logo = {
        exists: true,
        size: images.logo.size,
        mimeType: images.logo.mimeType,
        lastModified: images.logo.lastModified.toISOString(),
        tag: images.logo.tag,
        source: images.logo.source,
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
   * Configura headers de caché para la respuesta (V2 con tag)
   */
  private setCacheHeaders(
    res: FastifyReply,
    imageResult: { mimeType: string; lastModified: Date; tag: string },
  ): void {
    // Content-Type
    res.header('Content-Type', imageResult.mimeType);

    // Last-Modified
    res.header('Last-Modified', imageResult.lastModified.toUTCString());

    // ETag usando el tag generado (MD5 de path + mtime)
    const etag = `"${imageResult.tag}"`;
    res.header('ETag', etag);

    // Cache-Control - Cache agresivo porque usamos tag-based invalidation
    // Si el tag cambia, la URL cambia → navegador pide nueva imagen
    res.header('Cache-Control', 'public, max-age=31536000, immutable');

    // Permitir CORS
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  }
}
