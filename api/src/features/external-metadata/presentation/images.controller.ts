import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Headers,
  NotFoundException,
  UseGuards,
  Header,
  StreamableFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { createReadStream } from 'fs';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { Public } from '@shared/decorators/public.decorator';
import { ImageService, ArtistImageType } from '../application/services/image.service';
import { ArtistImagesDto, ImageMetadataDto } from './dtos/artist-images.dto';

// Servir imágenes con cache HTTP (ETag, 304 Not Modified)
@ApiTags('images')
@Controller('images')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ImagesController {
  constructor(@InjectPinoLogger(ImagesController.name)
    private readonly logger: PinoLogger,
    private readonly imageService: ImageService) {}

  // Endpoints públicos para servir imágenes (necesario para <img src>)
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
  @ApiResponse({ status: 304, description: 'Not Modified (ETag matches)' })
  async getArtistImage(
    @Param('artistId', ParseUUIDPipe) artistId: string,
    @Param('imageType') imageType: string,
    @Query('tag') tag: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
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

      // HTTP Cache validation: Check If-None-Match header (ETag)
      // Only return 304 if client sends If-None-Match matching current ETag
      const currentETag = `"${imageResult.tag}"`;
      if (ifNoneMatch && ifNoneMatch === currentETag) {
        res.status(304);
        this.logger.debug(
          `304 Not Modified: ${artistId}/${imageType} (ETag match: ${currentETag})`,
        );
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

  @Public()
  @Get('albums/:albumId/cover')
  @ApiOperation({
    summary: 'Serve album cover',
    description:
      'Returns an album cover image file with appropriate cache headers. Supports tag-based cache busting.',
  })
  @ApiParam({
    name: 'albumId',
    description: 'Album UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'tag',
    required: false,
    description: 'Cache tag for cache busting (MD5 hash of filepath:mtime)',
    example: 'a1b2c3d4',
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
    @Param('albumId', ParseUUIDPipe) albumId: string,
    @Query('tag') tag: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<StreamableFile | void> {
    try {
      // Obtener información de la portada
      const imageResult = await this.imageService.getAlbumCover(albumId);

      // HTTP Cache validation: Check If-None-Match header (ETag)
      const currentETag = `"${imageResult.tag}"`;
      if (ifNoneMatch && ifNoneMatch === currentETag) {
        res.status(304);
        this.logger.debug(
          `304 Not Modified: album ${albumId} cover (ETag match: ${currentETag})`,
        );
        return;
      }

      // Configurar headers de caché
      this.setCacheHeaders(res, imageResult);

      // Crear stream del archivo
      const fileStream = createReadStream(imageResult.filePath);

      this.logger.debug(
        `Serving album cover: ${albumId} (${imageResult.size} bytes, tag: ${imageResult.tag})`,
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

  @Public()
  @Get('albums/:albumId/custom/:customCoverId')
  @ApiOperation({
    summary: 'Serve custom album cover by ID',
    description: 'Returns a custom uploaded cover file',
  })
  @ApiParam({
    name: 'albumId',
    description: 'Album UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'customCoverId',
    description: 'Custom cover UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Custom cover returned successfully',
    content: {
      'image/jpeg': {},
      'image/png': {},
      'image/webp': {},
    },
  })
  @ApiResponse({ status: 404, description: 'Custom cover not found' })
  async getCustomAlbumCover(
    @Param('albumId', ParseUUIDPipe) albumId: string,
    @Param('customCoverId', ParseUUIDPipe) customCoverId: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<StreamableFile> {
    try {
      // Obtener información de la portada personalizada
      const customCover = await this.imageService.getCustomAlbumCover(
        albumId,
        customCoverId,
      );

      // Configurar headers de caché
      this.setCacheHeaders(res, customCover);

      // Crear stream del archivo
      const fileStream = createReadStream(customCover.filePath);

      this.logger.debug(
        `Serving custom album cover: ${customCoverId} (${customCover.size} bytes)`,
      );

      return new StreamableFile(fileStream);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error serving custom album cover ${customCoverId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new NotFoundException(
        `Unable to serve custom cover ${customCoverId}`,
      );
    }
  }

  @Public()
  @Get('artists/:artistId/custom/:customImageId')
  @ApiOperation({
    summary: 'Serve custom artist image by ID',
    description: 'Returns a custom uploaded image file',
  })
  @ApiParam({
    name: 'artistId',
    description: 'Artist UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'customImageId',
    description: 'Custom image UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Custom image returned successfully',
    content: {
      'image/jpeg': {},
      'image/png': {},
      'image/webp': {},
    },
  })
  @ApiResponse({ status: 404, description: 'Custom image not found' })
  async getCustomArtistImage(
    @Param('artistId', ParseUUIDPipe) artistId: string,
    @Param('customImageId', ParseUUIDPipe) customImageId: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<StreamableFile> {
    try {
      // Obtener información de la imagen personalizada
      const customImage = await this.imageService.getCustomArtistImage(
        artistId,
        customImageId,
      );

      // Configurar headers de caché
      this.setCacheHeaders(res, customImage);

      // Crear stream del archivo
      const fileStream = createReadStream(customImage.filePath);

      this.logger.debug(
        `Serving custom artist image: ${customImageId} (${customImage.size} bytes)`,
      );

      return new StreamableFile(fileStream);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error serving custom artist image ${customImageId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new NotFoundException(
        `Unable to serve custom image ${customImageId}`,
      );
    }
  }

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
    @Param('artistId', ParseUUIDPipe) artistId: string,
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

  @Get('albums/:albumId/cover/metadata')
  @ApiOperation({
    summary: 'Get album cover metadata',
    description:
      'Returns metadata for album cover including tag for cache busting',
  })
  @ApiResponse({
    status: 200,
    description: 'Cover metadata returned successfully',
    schema: {
      type: 'object',
      properties: {
        albumId: { type: 'string' },
        cover: {
          type: 'object',
          properties: {
            exists: { type: 'boolean' },
            size: { type: 'number' },
            mimeType: { type: 'string' },
            lastModified: { type: 'string' },
            tag: { type: 'string' },
            source: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Album not found' })
  async getAlbumCoverMetadata(@Param('albumId') albumId: string) {
    try {
      const coverResult = await this.imageService.getAlbumCover(albumId);

      return {
        albumId,
        cover: {
          exists: true,
          size: coverResult.size,
          mimeType: coverResult.mimeType,
          lastModified: coverResult.lastModified.toISOString(),
          tag: coverResult.tag,
          source: coverResult.source,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          albumId,
          cover: {
            exists: false,
          },
        };
      }
      throw error;
    }
  }

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
    @Param('userId', ParseUUIDPipe) userId: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<StreamableFile> {
    try {
      // Obtener información del avatar
      const imageResult = await this.imageService.getUserAvatar(userId);

      // User avatars use revalidation-based caching (ETag) instead of
      // immutable caching, because the URL stays the same when avatar changes
      this.setRevalidateCacheHeaders(res, imageResult);

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

  /**
   * Cache headers for mutable resources (user avatars).
   * Uses ETag revalidation so browser always checks if content changed,
   * but gets a fast 304 response when it hasn't.
   */
  private setRevalidateCacheHeaders(
    res: FastifyReply,
    imageResult: { mimeType: string; lastModified: Date; tag: string },
  ): void {
    res.header('Content-Type', imageResult.mimeType);
    res.header('Last-Modified', imageResult.lastModified.toUTCString());
    res.header('ETag', `"${imageResult.tag}"`);
    res.header('Cache-Control', 'no-cache');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  }

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
