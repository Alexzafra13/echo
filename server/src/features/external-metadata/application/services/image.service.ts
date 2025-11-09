import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { StorageService } from '../../infrastructure/services/storage.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

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
 * ImageService V2
 *
 * Servicio para obtener y servir imágenes con arquitectura Jellyfin-style.
 *
 * Características V2:
 * - Priorización: Local (disco) > External (descargado)
 * - Tag-based cache busting (MD5 de path + mtime)
 * - Separación explícita de fuentes (local vs external)
 * - Timestamps independientes por tipo de imagen
 * - Validación y limpieza automática de archivos borrados
 */
@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly imageCache = new Map<string, ImageResult>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Obtiene una imagen de artista con priorización Local > External
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

    // Obtener artista de la base de datos
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      select: {
        id: true,
        // Local images
        profileImagePath: true,
        profileImageUpdatedAt: true,
        backgroundImagePath: true,
        backgroundUpdatedAt: true,
        bannerImagePath: true,
        bannerUpdatedAt: true,
        logoImagePath: true,
        logoUpdatedAt: true,
        // External images
        externalProfilePath: true,
        externalProfileUpdatedAt: true,
        externalBackgroundPath: true,
        externalBackgroundUpdatedAt: true,
        externalBannerPath: true,
        externalBannerUpdatedAt: true,
        externalLogoPath: true,
        externalLogoUpdatedAt: true,
      },
    });

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
          mimeType: this.getMimeType(localPath),
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
          mimeType: this.getMimeType(fullPath),
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
   * Obtiene la portada de un álbum
   */
  async getAlbumCover(albumId: string): Promise<ImageResult> {
    const cacheKey = `album:${albumId}:cover`;

    // Verificar caché
    const cached = this.imageCache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    // Obtener álbum de la base de datos
    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
      select: {
        id: true,
        externalCoverPath: true,
        coverArtPath: true,
      },
    });

    if (!album) {
      throw new NotFoundException(`Album with ID ${albumId} not found`);
    }

    // Priorizar externalCoverPath sobre coverArtPath
    const coverPath = album.externalCoverPath || album.coverArtPath;

    this.logger.debug(`Album ${albumId}: externalCoverPath=${album.externalCoverPath}, coverArtPath=${album.coverArtPath}, using: ${coverPath}`);

    let imageResult: ImageResult;

    if (!coverPath) {
      // Usar imagen por defecto si no hay cover
      this.logger.debug(`Album ${albumId} has no cover, using default image`);
      const defaultCoverPath = 'defaults/album-cover-default.png';
      imageResult = await this.getImageFileInfo(defaultCoverPath, 'local');
    } else {
      // Si coverPath no tiene path absoluto ni relativo (solo nombre de archivo),
      // asumir que está en uploads/covers/
      let fullPath = coverPath;
      if (!coverPath.includes('/') && !coverPath.includes('\\')) {
        fullPath = `uploads/covers/${coverPath}`;
        this.logger.debug(`Converted relative cover path to: ${fullPath}`);
      }

      // Verificar que el archivo existe y obtener metadata
      imageResult = await this.getImageFileInfo(fullPath, 'external');
    }

    // Cachear resultado
    this.cacheImageResult(cacheKey, imageResult);

    return imageResult;
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        avatarPath: true,
        avatarMimeType: true,
        avatarSize: true,
      },
    });

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

      // Detectar MIME type por extensión
      const mimeType = this.getMimeType(filePath);

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
   * Detecta el MIME type a partir de la extensión del archivo
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
    };

    return mimeTypes[ext] || 'application/octet-stream';
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
      await this.prisma.artist.update({
        where: { id: artistId },
        data: {
          [`${imageType}ImagePath`]: null,
          [`${imageType}UpdatedAt`]: null,
        },
      });
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
      await this.prisma.artist.update({
        where: { id: artistId },
        data: {
          [`external${capitalizedType}Path`]: null,
          [`external${capitalizedType}Source`]: null,
          [`external${capitalizedType}UpdatedAt`]: null,
        },
      });
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
