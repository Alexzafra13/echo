import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { StorageService } from '../../infrastructure/services/storage.service';
import { getMimeType } from '@shared/utils';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { eq, and, desc } from 'drizzle-orm';
import {
  artists,
  albums,
  customArtistImages,
  customAlbumCovers,
  users,
} from '@infrastructure/database/schema';

/**
 * Tipos de imágenes de artista soportadas
 */
export type ArtistImageType =
  | 'profile'
  | 'background'
  | 'banner'
  | 'logo';

/**
 * Resultado de la búsqueda de imagen (V2 con tag y source)
 */
export interface ImageResult {
  /** Ruta absoluta del archivo de imagen */
  filePath: string;
  /** MIME type de la imagen */
  mimeType: string;
  /** Tamaño del archivo en bytes */
  size: number;
  /** Última modificación del archivo */
  lastModified: Date;
  /** Fuente de la imagen: 'local' (disco) o 'external' (descargada) */
  source: 'local' | 'external';
  /** Tag único para cache-busting (MD5 de path + mtime) */
  tag: string;
}

/**
 * ImageService V3
 *
 * Servicio para obtener y servir imágenes con arquitectura Jellyfin-style.
 *
 * Características V3:
 * - Priorización: Custom (subidas por usuario) > Local (disco) > External (descargado)
 * - Tag-based cache busting (MD5 de path + mtime)
 * - Soporte para custom images subidas desde PC (customArtistImage table)
 * - Separación explícita de fuentes (local vs external)
 * - Timestamps independientes por tipo de imagen
 * - Validación y limpieza automática de archivos borrados
 */
@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly imageCache = new Map<string, ImageResult>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
  private readonly coversPath: string;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {
    // Same path resolution logic as CoverArtService to ensure consistency
    const coversPath = this.config.get<string>('COVERS_PATH');
    if (coversPath) {
      this.coversPath = coversPath;
    } else {
      const dataPath = this.config.get<string>('DATA_PATH');
      if (dataPath) {
        this.coversPath = path.join(dataPath, 'uploads', 'covers');
      } else {
        const uploadPath = this.config.get<string>('UPLOAD_PATH', './uploads');
        this.coversPath = path.join(uploadPath, 'covers');
      }
    }
    this.logger.log(`Album covers path: ${this.coversPath}`);
  }

  /**
   * Obtiene una imagen de artista con priorización Custom > Local > External
   */
  async getArtistImage(
    artistId: string,
    imageType: ArtistImageType,
  ): Promise<ImageResult> {
    const cacheKey = `artist:${artistId}:${imageType}`;

    // Verificar caché
    const cached = this.imageCache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    // PRIORIDAD 0: Custom uploaded image (máxima prioridad)
    const result = await this.drizzle.db
      .select()
      .from(customArtistImages)
      .where(
        and(
          eq(customArtistImages.artistId, artistId),
          eq(customArtistImages.imageType, imageType),
          eq(customArtistImages.isActive, true),
        ),
      )
      .orderBy(desc(customArtistImages.updatedAt))
      .limit(1);

    const customImage = result[0];

    if (customImage) {
      try {
        // Construir ruta absoluta desde la ruta relativa guardada en BD
        const basePath = await this.storage.getArtistMetadataPath(artistId);
        // Normalize path separators for cross-platform compatibility
        // Old records may have Windows backslashes (\) in the database
        const normalizedPath = customImage.filePath.replace(/\\/g, '/');
        const absolutePath = path.join(basePath, normalizedPath);

        await fs.access(absolutePath);
        const stats = await fs.stat(absolutePath);
        const result: ImageResult = {
          filePath: absolutePath,
          mimeType: customImage.mimeType,
          size: Number(customImage.fileSize),
          lastModified: stats.mtime,
          source: 'local', // Custom images are treated as local
          tag: this.generateTag(absolutePath, stats.mtime),
        };

        this.cacheImageResult(cacheKey, result);
        this.logger.debug(`Serving CUSTOM image: ${imageType} from ${absolutePath}`);
        return result;
      } catch (error) {
        // Archivo custom ya no existe, desactivar en BD
        this.logger.warn(`Custom ${imageType} image not found, deactivating: ${customImage.filePath}`);
        await this.drizzle.db
          .update(customArtistImages)
          .set({ isActive: false })
          .where(eq(customArtistImages.id, customImage.id));
      }
    }

    // Obtener artista de la base de datos
    const artistResult = await this.drizzle.db
      .select({
        id: artists.id,
        // Local images
        profileImagePath: artists.profileImagePath,
        profileImageUpdatedAt: artists.profileImageUpdatedAt,
        backgroundImagePath: artists.backgroundImagePath,
        backgroundUpdatedAt: artists.backgroundUpdatedAt,
        bannerImagePath: artists.bannerImagePath,
        bannerUpdatedAt: artists.bannerUpdatedAt,
        logoImagePath: artists.logoImagePath,
        logoUpdatedAt: artists.logoUpdatedAt,
        // External images
        externalProfilePath: artists.externalProfilePath,
        externalProfileUpdatedAt: artists.externalProfileUpdatedAt,
        externalBackgroundPath: artists.externalBackgroundPath,
        externalBackgroundUpdatedAt: artists.externalBackgroundUpdatedAt,
        externalBannerPath: artists.externalBannerPath,
        externalBannerUpdatedAt: artists.externalBannerUpdatedAt,
        externalLogoPath: artists.externalLogoPath,
        externalLogoUpdatedAt: artists.externalLogoUpdatedAt,
      })
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    const artist = artistResult[0];

    if (!artist) {
      throw new NotFoundException(`Artist with ID ${artistId} not found`);
    }

    // PRIORIDAD 1: Local image (desde disco del artista)
    const localPath = artist[`${imageType}ImagePath`];
    if (localPath) {
      try {
        await fs.access(localPath);
        const stats = await fs.stat(localPath);
        const result: ImageResult = {
          filePath: localPath,
          mimeType: getMimeType(path.extname(localPath)),
          size: stats.size,
          lastModified: stats.mtime,
          source: 'local',
          tag: this.generateTag(localPath, stats.mtime),
        };

        this.cacheImageResult(cacheKey, result);
        this.logger.debug(`Serving LOCAL image: ${imageType} from ${localPath}`);
        return result;
      } catch (error) {
        // Archivo local ya no existe, limpiar BD
        this.logger.warn(`Local ${imageType} image not found, cleaning DB: ${localPath}`);
        await this.clearLocalImage(artistId, imageType);
      }
    }

    // PRIORIDAD 2: External image (descargada de proveedores)
    const capitalizedType = this.capitalize(imageType);
    const externalFilename = artist[`external${capitalizedType}Path` as keyof typeof artist] as string | null;
    if (externalFilename && typeof externalFilename === 'string') {
      const fullPath = path.join(
        await this.storage.getArtistMetadataPath(artistId),
        externalFilename
      );

      try {
        await fs.access(fullPath);
        const stats = await fs.stat(fullPath);
        const result: ImageResult = {
          filePath: fullPath,
          mimeType: getMimeType(path.extname(fullPath)),
          size: stats.size,
          lastModified: stats.mtime,
          source: 'external',
          tag: this.generateTag(fullPath, stats.mtime),
        };

        this.cacheImageResult(cacheKey, result);
        this.logger.debug(`Serving EXTERNAL image: ${imageType} from ${fullPath}`);
        return result;
      } catch (error) {
        this.logger.warn(`External ${imageType} image not found, cleaning DB: ${fullPath}`);
        await this.clearExternalImage(artistId, imageType);
      }
    }

    throw new NotFoundException(`No ${imageType} image for artist ${artistId}`);
  }

  /**
   * Obtiene la portada de un álbum con priorización Custom > External > Local > Default
   */
  async getAlbumCover(albumId: string): Promise<ImageResult> {
    const cacheKey = `album:${albumId}:cover`;

    // Verificar caché
    const cached = this.imageCache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    // PRIORIDAD 0: Custom uploaded cover (máxima prioridad)
    const coverResult = await this.drizzle.db
      .select()
      .from(customAlbumCovers)
      .where(
        and(
          eq(customAlbumCovers.albumId, albumId),
          eq(customAlbumCovers.isActive, true),
        ),
      )
      .orderBy(desc(customAlbumCovers.updatedAt))
      .limit(1);

    const customCover = coverResult[0];

    if (customCover) {
      try {
        // Construir ruta absoluta desde la ruta relativa guardada en BD
        const basePath = path.join(
          await this.storage.getStoragePath(),
          'metadata',
          'albums',
          albumId
        );
        // Normalize path separators for cross-platform compatibility
        // Old records may have Windows backslashes (\) in the database
        const normalizedPath = customCover.filePath.replace(/\\/g, '/');
        const absolutePath = path.join(basePath, normalizedPath);

        await fs.access(absolutePath);
        const stats = await fs.stat(absolutePath);
        const result: ImageResult = {
          filePath: absolutePath,
          mimeType: customCover.mimeType,
          size: Number(customCover.fileSize),
          lastModified: stats.mtime,
          source: 'local', // Custom covers are treated as local
          tag: this.generateTag(absolutePath, stats.mtime),
        };

        this.cacheImageResult(cacheKey, result);
        this.logger.debug(`Serving CUSTOM album cover from ${absolutePath}`);
        return result;
      } catch (error) {
        // Archivo custom ya no existe, desactivar en BD
        this.logger.warn(`Custom album cover not found, deactivating: ${customCover.filePath}`);
        await this.drizzle.db
          .update(customAlbumCovers)
          .set({ isActive: false })
          .where(eq(customAlbumCovers.id, customCover.id));
      }
    }

    // Obtener álbum de la base de datos
    const albumResult = await this.drizzle.db
      .select({
        id: albums.id,
        externalCoverPath: albums.externalCoverPath,
        coverArtPath: albums.coverArtPath,
      })
      .from(albums)
      .where(eq(albums.id, albumId))
      .limit(1);

    const album = albumResult[0];

    if (!album) {
      throw new NotFoundException(`Album with ID ${albumId} not found`);
    }

    // PRIORIDAD 1: External cover (descargado de proveedores)
    // PRIORIDAD 2: Local cover (de disco/embedded)
    const coverPath = album.externalCoverPath || album.coverArtPath;

    this.logger.debug(`Album ${albumId}: externalCoverPath=${album.externalCoverPath}, coverArtPath=${album.coverArtPath}, using: ${coverPath}`);

    let imageResult: ImageResult;

    if (!coverPath) {
      // Usar imagen por defecto si no hay cover
      this.logger.debug(`Album ${albumId} has no cover, using default image`);
      const defaultCoverPath = 'defaults/album-cover-default.png';
      imageResult = await this.getImageFileInfo(defaultCoverPath, 'local');
    } else {
      // Resolve cover path:
      // - If it's an absolute path, use as-is
      // - If it's just a filename (no path separators), it's from the covers cache
      // - Otherwise, it's a relative path from the album folder
      let fullPath: string;

      if (path.isAbsolute(coverPath)) {
        // Already an absolute path (e.g., external covers in metadata storage)
        fullPath = coverPath;
      } else if (!coverPath.includes('/') && !coverPath.includes('\\')) {
        // Just a filename - it's in the covers cache (from embedded or folder.jpg)
        fullPath = path.join(this.coversPath, coverPath);
        this.logger.debug(`Resolved cover from cache: ${fullPath}`);
      } else {
        // Relative path - treat as-is (might be relative to cwd or album folder)
        fullPath = coverPath;
      }

      // Determine source based on which field we're using
      const source = album.externalCoverPath ? 'external' : 'local';

      // Verificar que el archivo existe y obtener metadata
      imageResult = await this.getImageFileInfo(fullPath, source);
    }

    // Cachear resultado
    this.cacheImageResult(cacheKey, imageResult);

    return imageResult;
  }

  /**
   * Obtiene una portada personalizada de álbum por su ID
   */
  async getCustomAlbumCover(
    albumId: string,
    customCoverId: string,
  ): Promise<ImageResult> {
    const cacheKey = `custom:album:${albumId}:${customCoverId}`;

    // Verificar caché
    const cached = this.imageCache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    // Obtener portada personalizada de la base de datos
    const coverResult = await this.drizzle.db
      .select()
      .from(customAlbumCovers)
      .where(
        and(
          eq(customAlbumCovers.id, customCoverId),
          eq(customAlbumCovers.albumId, albumId),
        ),
      )
      .limit(1);

    const customCover = coverResult[0];

    if (!customCover) {
      throw new NotFoundException(
        `Custom cover ${customCoverId} not found for album ${albumId}`,
      );
    }

    // Verificar que el archivo existe y obtener metadata
    try {
      // Construir ruta absoluta desde la ruta relativa guardada en BD
      const basePath = path.join(
        await this.storage.getStoragePath(),
        'metadata',
        'albums',
        albumId
      );
      const absolutePath = path.join(basePath, customCover.filePath);

      await fs.access(absolutePath);
      const stats = await fs.stat(absolutePath);
      const result: ImageResult = {
        filePath: absolutePath,
        mimeType: customCover.mimeType,
        size: Number(customCover.fileSize),
        lastModified: stats.mtime,
        source: 'local',
        tag: this.generateTag(absolutePath, stats.mtime),
      };

      this.cacheImageResult(cacheKey, result);
      this.logger.debug(`Serving custom album cover: ${customCoverId}`);
      return result;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new NotFoundException(
          `Custom cover file not found: ${customCover.filePath}`,
        );
      }
      throw error;
    }
  }

  /**
   * Obtiene una imagen personalizada de artista por su ID
   */
  async getCustomArtistImage(
    artistId: string,
    customImageId: string,
  ): Promise<ImageResult> {
    const cacheKey = `custom:${artistId}:${customImageId}`;

    // Verificar caché
    const cached = this.imageCache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    // Obtener imagen personalizada de la base de datos
    const imageResult = await this.drizzle.db
      .select()
      .from(customArtistImages)
      .where(
        and(
          eq(customArtistImages.id, customImageId),
          eq(customArtistImages.artistId, artistId),
        ),
      )
      .limit(1);

    const customImage = imageResult[0];

    if (!customImage) {
      throw new NotFoundException(
        `Custom image ${customImageId} not found for artist ${artistId}`,
      );
    }

    // Verificar que el archivo existe y obtener metadata
    try {
      // Construir ruta absoluta desde la ruta relativa guardada en BD
      const basePath = await this.storage.getArtistMetadataPath(artistId);
      const absolutePath = path.join(basePath, customImage.filePath);

      await fs.access(absolutePath);
      const stats = await fs.stat(absolutePath);
      const result: ImageResult = {
        filePath: absolutePath,
        mimeType: customImage.mimeType,
        size: Number(customImage.fileSize),
        lastModified: stats.mtime,
        source: 'local',
        tag: this.generateTag(absolutePath, stats.mtime),
      };

      this.cacheImageResult(cacheKey, result);
      this.logger.debug(`Serving custom image: ${customImageId}`);
      return result;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new NotFoundException(
          `Custom image file not found: ${customImage.filePath}`,
        );
      }
      throw error;
    }
  }

  /**
   * Obtiene el avatar de un usuario
   */
  async getUserAvatar(userId: string): Promise<ImageResult> {
    const cacheKey = `user:${userId}:avatar`;

    // Verificar caché
    const cached = this.imageCache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    // Obtener usuario de la base de datos
    const userResult = await this.drizzle.db
      .select({
        id: users.id,
        avatarPath: users.avatarPath,
        avatarMimeType: users.avatarMimeType,
        avatarSize: users.avatarSize,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = userResult[0];

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.avatarPath) {
      throw new NotFoundException(
        `User ${userId} does not have an avatar`,
      );
    }

    // Verificar que el archivo existe y obtener metadata
    const imageResult = await this.getImageFileInfo(user.avatarPath, 'local');

    // Cachear resultado
    this.cacheImageResult(cacheKey, imageResult);

    return imageResult;
  }

  /**
   * Verifica si un artista tiene una imagen específica
   */
  async hasArtistImage(
    artistId: string,
    imageType: ArtistImageType,
  ): Promise<boolean> {
    try {
      await this.getArtistImage(artistId, imageType);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifica si un álbum tiene portada
   */
  async hasAlbumCover(albumId: string): Promise<boolean> {
    try {
      await this.getAlbumCover(albumId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene todas las imágenes disponibles de un artista
   */
  async getArtistImages(artistId: string): Promise<{
    profile?: ImageResult;
    background?: ImageResult;
    banner?: ImageResult;
    logo?: ImageResult;
  }> {
    const imageTypes: ArtistImageType[] = [
      'profile',
      'background',
      'banner',
      'logo',
    ];

    const results: any = {};

    for (const imageType of imageTypes) {
      try {
        const image = await this.getArtistImage(artistId, imageType);
        results[imageType] = image;
      } catch (error) {
        // Imagen no disponible, continuar
        this.logger.debug(
          `Image ${imageType} not available for artist ${artistId}`,
        );
      }
    }

    return results;
  }

  /**
   * Invalida el caché para una imagen específica
   */
  invalidateCache(key: string): void {
    this.imageCache.delete(key);
    this.logger.debug(`Cache invalidated for ${key}`);
  }

  /**
   * Invalida todo el caché de imágenes de un artista
   */
  invalidateArtistCache(artistId: string): void {
    const imageTypes: ArtistImageType[] = [
      'profile',
      'background',
      'banner',
      'logo',
    ];

    for (const imageType of imageTypes) {
      const cacheKey = `artist:${artistId}:${imageType}`;
      this.imageCache.delete(cacheKey);
    }

    this.logger.debug(`Artist cache invalidated for ${artistId}`);
  }

  /**
   * Invalida el caché de portada de un álbum
   */
  invalidateAlbumCache(albumId: string): void {
    const cacheKey = `album:${albumId}:cover`;
    this.imageCache.delete(cacheKey);
    this.logger.debug(`Album cache invalidated for ${albumId}`);
  }

  /**
   * Invalida el caché de avatar de un usuario
   */
  invalidateUserAvatarCache(userId: string): void {
    const cacheKey = `user:${userId}:avatar`;
    this.imageCache.delete(cacheKey);
    this.logger.debug(`User avatar cache invalidated for ${userId}`);
  }

  /**
   * Limpia todo el caché
   */
  clearCache(): void {
    this.imageCache.clear();
    this.logger.debug('Image cache cleared');
  }

  /**
   * Obtiene el tamaño actual del caché
   */
  getCacheSize(): number {
    return this.imageCache.size;
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  /**
   * Obtiene información del archivo de imagen
   */
  private async getImageFileInfo(filePath: string, source: 'local' | 'external'): Promise<ImageResult> {
    try {
      // Verificar que el archivo existe
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        throw new NotFoundException(`Path ${filePath} is not a file`);
      }

      // Detectar MIME type por extensión usando utilidad compartida
      const mimeType = getMimeType(path.extname(filePath));

      return {
        filePath,
        mimeType,
        size: stats.size,
        lastModified: stats.mtime,
        source,
        tag: this.generateTag(filePath, stats.mtime),
      };
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new NotFoundException(`Image file not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Genera un tag único para cache-busting usando MD5
   */
  private generateTag(filePath: string, mtime: Date): string {
    return createHash('md5')
      .update(`${filePath}:${mtime.getTime()}`)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Cachea un resultado de imagen con TTL
   */
  private cacheImageResult(key: string, result: ImageResult): void {
    this.imageCache.set(key, result);

    // Invalidar caché después del TTL
    setTimeout(() => {
      this.imageCache.delete(key);
      this.logger.debug(`Cache expired for ${key}`);
    }, this.CACHE_TTL_MS);

    this.logger.debug(`Cached ${key} for ${this.CACHE_TTL_MS}ms`);
  }

  /**
   * Limpia referencia a imagen local cuando el archivo no existe
   */
  private async clearLocalImage(artistId: string, imageType: ArtistImageType): Promise<void> {
    try {
      // Mapeo correcto de campos en la BD
      const fieldMappings: Record<ArtistImageType, { path: string; updatedAt: string }> = {
        profile: { path: 'profileImagePath', updatedAt: 'profileImageUpdatedAt' },
        background: { path: 'backgroundImagePath', updatedAt: 'backgroundUpdatedAt' },
        banner: { path: 'bannerImagePath', updatedAt: 'bannerUpdatedAt' },
        logo: { path: 'logoImagePath', updatedAt: 'logoUpdatedAt' },
      };

      const fields = fieldMappings[imageType];
      await this.drizzle.db
        .update(artists)
        .set({
          [fields.path]: null,
          [fields.updatedAt]: null,
        })
        .where(eq(artists.id, artistId));
      this.logger.debug(`Cleared local ${imageType} reference for artist ${artistId}`);
    } catch (error) {
      this.logger.error(`Failed to clear local ${imageType} for ${artistId}: ${(error as Error).message}`);
    }
  }

  /**
   * Limpia referencia a imagen externa cuando el archivo no existe
   */
  private async clearExternalImage(artistId: string, imageType: ArtistImageType): Promise<void> {
    try {
      const capitalizedType = this.capitalize(imageType);
      await this.drizzle.db
        .update(artists)
        .set({
          [`external${capitalizedType}Path`]: null,
          [`external${capitalizedType}Source`]: null,
          [`external${capitalizedType}UpdatedAt`]: null,
        })
        .where(eq(artists.id, artistId));
      this.logger.debug(`Cleared external ${imageType} reference for artist ${artistId}`);
    } catch (error) {
      this.logger.error(`Failed to clear external ${imageType} for ${artistId}: ${(error as Error).message}`);
    }
  }

  /**
   * Capitaliza la primera letra de un string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
