import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { getMimeType } from '@shared/utils';
import { isFileNotFoundError } from '@shared/types/error.types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { eq } from 'drizzle-orm';
import { users } from '@infrastructure/database/schema';
import {
  ImageCacheService,
  CachedImageResult,
  ArtistImageService,
  AlbumCoverService,
} from './images';

// Re-export types for backwards compatibility
export type ArtistImageType = 'profile' | 'background' | 'banner' | 'logo';
export type ImageResult = CachedImageResult;

/**
 * ImageService V3 - Facade
 *
 * Orchestrates image retrieval for artists, albums, and users.
 * Delegates to specialized services for each entity type.
 */
@Injectable()
export class ImageService {
  constructor(
    @InjectPinoLogger(ImageService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly cache: ImageCacheService,
    private readonly artistImageService: ArtistImageService,
    private readonly albumCoverService: AlbumCoverService,
  ) {}

  // ============================================
  // ARTIST IMAGES (delegated)
  // ============================================

  /**
   * Get artist image with priority Custom > Local > External
   */
  async getArtistImage(artistId: string, imageType: ArtistImageType): Promise<ImageResult> {
    return this.artistImageService.getArtistImage(artistId, imageType);
  }

  /**
   * Get custom artist image by ID
   */
  async getCustomArtistImage(artistId: string, customImageId: string): Promise<ImageResult> {
    return this.artistImageService.getCustomArtistImage(artistId, customImageId);
  }

  /**
   * Get all available images for an artist
   */
  async getArtistImages(artistId: string): Promise<{
    profile?: ImageResult;
    background?: ImageResult;
    banner?: ImageResult;
    logo?: ImageResult;
  }> {
    return this.artistImageService.getArtistImages(artistId);
  }

  /**
   * Check if artist has a specific image
   */
  async hasArtistImage(artistId: string, imageType: ArtistImageType): Promise<boolean> {
    return this.artistImageService.hasArtistImage(artistId, imageType);
  }

  // ============================================
  // ALBUM COVERS (delegated)
  // ============================================

  /**
   * Get album cover with priority Custom > External > Local > Default
   */
  async getAlbumCover(albumId: string): Promise<ImageResult> {
    return this.albumCoverService.getAlbumCover(albumId);
  }

  /**
   * Get custom album cover by ID
   */
  async getCustomAlbumCover(albumId: string, customCoverId: string): Promise<ImageResult> {
    return this.albumCoverService.getCustomAlbumCover(albumId, customCoverId);
  }

  /**
   * Check if album has cover
   */
  async hasAlbumCover(albumId: string): Promise<boolean> {
    return this.albumCoverService.hasAlbumCover(albumId);
  }

  // ============================================
  // USER AVATARS
  // ============================================

  /**
   * Get user avatar
   */
  async getUserAvatar(userId: string): Promise<ImageResult> {
    const cacheKey = `user:${userId}:avatar`;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const userResult = await this.drizzle.db
      .select({
        id: users.id,
        avatarPath: users.avatarPath,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = userResult[0];

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.avatarPath) {
      throw new NotFoundException(`User ${userId} does not have an avatar`);
    }

    const result = await this.getImageFileInfo(user.avatarPath, 'local');
    this.cache.set(cacheKey, result);

    return result;
  }

  // ============================================
  // CACHE MANAGEMENT (delegated)
  // ============================================

  /**
   * Invalidate cache for a specific key
   */
  invalidateCache(key: string): void {
    this.cache.invalidate(key);
  }

  /**
   * Invalidate all cache for an artist
   */
  invalidateArtistCache(artistId: string): void {
    this.cache.invalidateArtist(artistId);
  }

  /**
   * Invalidate album cover cache
   */
  invalidateAlbumCache(albumId: string): void {
    this.cache.invalidateAlbum(albumId);
  }

  /**
   * Invalidate user avatar cache
   */
  invalidateUserAvatarCache(userId: string): void {
    this.cache.invalidateUserAvatar(userId);
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  getCacheSize(): number {
    return this.cache.size();
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Get file info for an image
   */
  private async getImageFileInfo(filePath: string, source: 'local' | 'external'): Promise<ImageResult> {
    try {
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        throw new NotFoundException(`Path ${filePath} is not a file`);
      }

      return {
        filePath,
        mimeType: getMimeType(path.extname(filePath)),
        size: stats.size,
        lastModified: stats.mtime,
        source,
        tag: this.cache.generateTag(filePath, stats.mtime),
      };
    } catch (error) {
      if (isFileNotFoundError(error)) {
        throw new NotFoundException(`Image file not found: ${filePath}`);
      }
      throw error;
    }
  }
}
