import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Tipos de imágenes de artista soportadas
 */
export type ArtistImageType =
  | 'profile-small'
  | 'profile-medium'
  | 'profile-large'
  | 'background'
  | 'banner'
  | 'logo';

/**
 * Resultado de la búsqueda de imagen
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
}

/**
 * ImageService
 *
 * Servicio para obtener y servir imágenes almacenadas localmente
 * desde metadatos externos (artistas y álbumes).
 *
 * Funcionalidades:
 * - Obtener rutas de imágenes desde la base de datos
 * - Cacheo en memoria para rutas frecuentes
 * - Validación de existencia de archivos
 * - Mapeo de tipos de imagen a campos de base de datos
 */
@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly imageCache = new Map<string, ImageResult>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene una imagen de artista
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
        smallImageUrl: true,
        mediumImageUrl: true,
        largeImageUrl: true,
        backgroundImageUrl: true,
        bannerImageUrl: true,
        logoImageUrl: true,
      },
    });

    if (!artist) {
      throw new NotFoundException(`Artist with ID ${artistId} not found`);
    }

    // Mapear tipo de imagen a campo de base de datos
    const imagePath = this.getArtistImagePath(artist, imageType);

    if (!imagePath) {
      throw new NotFoundException(
        `Artist ${artistId} does not have a ${imageType} image`,
      );
    }

    // Verificar que el archivo existe y obtener metadata
    const imageResult = await this.getImageFileInfo(imagePath);

    // Cachear resultado
    this.cacheImageResult(cacheKey, imageResult);

    return imageResult;
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

    if (!coverPath) {
      throw new NotFoundException(
        `Album ${albumId} does not have a cover image`,
      );
    }

    // Verificar que el archivo existe y obtener metadata
    const imageResult = await this.getImageFileInfo(coverPath);

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
    profileSmall?: ImageResult;
    profileMedium?: ImageResult;
    profileLarge?: ImageResult;
    background?: ImageResult;
    banner?: ImageResult;
    logo?: ImageResult;
  }> {
    const imageTypes: ArtistImageType[] = [
      'profile-small',
      'profile-medium',
      'profile-large',
      'background',
      'banner',
      'logo',
    ];

    const results: any = {};

    for (const imageType of imageTypes) {
      try {
        const image = await this.getArtistImage(artistId, imageType);
        const key = imageType.replace('-', '');
        results[key] = image;
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
      'profile-small',
      'profile-medium',
      'profile-large',
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
   * Mapea el tipo de imagen a la ruta en la base de datos
   */
  private getArtistImagePath(
    artist: {
      smallImageUrl: string | null;
      mediumImageUrl: string | null;
      largeImageUrl: string | null;
      backgroundImageUrl: string | null;
      bannerImageUrl: string | null;
      logoImageUrl: string | null;
    },
    imageType: ArtistImageType,
  ): string | null {
    switch (imageType) {
      case 'profile-small':
        return artist.smallImageUrl;
      case 'profile-medium':
        return artist.mediumImageUrl;
      case 'profile-large':
        return artist.largeImageUrl;
      case 'background':
        return artist.backgroundImageUrl;
      case 'banner':
        return artist.bannerImageUrl;
      case 'logo':
        return artist.logoImageUrl;
      default:
        return null;
    }
  }

  /**
   * Obtiene información del archivo de imagen
   */
  private async getImageFileInfo(filePath: string): Promise<ImageResult> {
    try {
      // Verificar que el archivo existe
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        throw new NotFoundException(`Path ${filePath} is not a file`);
      }

      // Detectar MIME type por extensión
      const mimeType = this.getMimeTypeFromPath(filePath);

      return {
        filePath,
        mimeType,
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundException(`Image file not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Detecta el MIME type a partir de la extensión del archivo
   */
  private getMimeTypeFromPath(filePath: string): string {
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
}
