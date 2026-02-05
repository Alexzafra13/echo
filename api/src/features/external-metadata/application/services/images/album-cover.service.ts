import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { StorageService } from '../../../infrastructure/services/storage.service';
import { getMimeType } from '@shared/utils';
import { isFileNotFoundError } from '@shared/types/error.types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { eq, and, desc } from 'drizzle-orm';
import { albums, customAlbumCovers } from '@infrastructure/database/schema';
import { ImageCacheService, CachedImageResult } from './image-cache.service';

/**
 * Service for retrieving album covers
 * Handles priority: Custom > External > Local > Default
 */
@Injectable()
export class AlbumCoverService {
  private readonly coversPath: string;

  constructor(
    @InjectPinoLogger(AlbumCoverService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
    private readonly cache: ImageCacheService,
    private readonly config: ConfigService,
  ) {
    // Same path resolution logic as CoverArtService
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
  }

  /**
   * Get album cover with priority Custom > External > Local > Default
   */
  async getAlbumCover(albumId: string): Promise<CachedImageResult> {
    const cacheKey = `album:${albumId}:cover`;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // PRIORITY 0: Custom uploaded cover
    const customResult = await this.tryCustomCover(albumId);
    if (customResult) {
      this.cache.set(cacheKey, customResult);
      return customResult;
    }

    // Get album from database
    const album = await this.getAlbum(albumId);
    if (!album) {
      throw new NotFoundException(`Album with ID ${albumId} not found`);
    }

    // PRIORITY 1: External cover (downloaded)
    // PRIORITY 2: Local cover (from disk/embedded)
    const coverPath = album.externalCoverPath || album.coverArtPath;
    const source = album.externalCoverPath ? 'external' : 'local';

    this.logger.debug(`Album ${albumId}: using ${source} cover: ${coverPath}`);

    let result: CachedImageResult;

    if (!coverPath) {
      // Use default image
      this.logger.debug(`Album ${albumId} has no cover, using default image`);
      result = await this.getDefaultCover();
    } else {
      result = await this.resolveCoverPath(coverPath, source);
    }

    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Get custom album cover by ID
   */
  async getCustomAlbumCover(albumId: string, customCoverId: string): Promise<CachedImageResult> {
    const cacheKey = `custom:album:${albumId}:${customCoverId}`;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

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
      throw new NotFoundException(`Custom cover ${customCoverId} not found for album ${albumId}`);
    }

    try {
      const basePath = path.join(
        await this.storage.getStoragePath(),
        'metadata',
        'albums',
        albumId
      );
      const absolutePath = path.join(basePath, customCover.filePath);

      await fs.access(absolutePath);
      const stats = await fs.stat(absolutePath);
      const result: CachedImageResult = {
        filePath: absolutePath,
        mimeType: customCover.mimeType,
        size: Number(customCover.fileSize),
        lastModified: stats.mtime,
        source: 'local',
        tag: this.cache.generateTag(absolutePath, stats.mtime),
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (isFileNotFoundError(error)) {
        throw new NotFoundException(`Custom cover file not found: ${customCover.filePath}`);
      }
      throw error;
    }
  }

  /**
   * Check if album has cover
   */
  async hasAlbumCover(albumId: string): Promise<boolean> {
    try {
      await this.getAlbumCover(albumId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Try to get custom uploaded cover
   */
  private async tryCustomCover(albumId: string): Promise<CachedImageResult | null> {
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
    if (!customCover) return null;

    try {
      const basePath = path.join(
        await this.storage.getStoragePath(),
        'metadata',
        'albums',
        albumId
      );
      const normalizedPath = customCover.filePath.replace(/\\/g, '/');
      const absolutePath = path.join(basePath, normalizedPath);

      await fs.access(absolutePath);
      const stats = await fs.stat(absolutePath);

      this.logger.debug(`Serving CUSTOM album cover from ${absolutePath}`);
      return {
        filePath: absolutePath,
        mimeType: customCover.mimeType,
        size: Number(customCover.fileSize),
        lastModified: stats.mtime,
        source: 'local',
        tag: this.cache.generateTag(absolutePath, stats.mtime),
      };
    } catch {
      this.logger.warn(`Custom album cover not found, deactivating: ${customCover.filePath}`);
      await this.drizzle.db
        .update(customAlbumCovers)
        .set({ isActive: false })
        .where(eq(customAlbumCovers.id, customCover.id));
      return null;
    }
  }

  /**
   * Get album from database
   */
  private async getAlbum(albumId: string): Promise<{ externalCoverPath: string | null; coverArtPath: string | null } | null> {
    const result = await this.drizzle.db
      .select({
        id: albums.id,
        externalCoverPath: albums.externalCoverPath,
        coverArtPath: albums.coverArtPath,
      })
      .from(albums)
      .where(eq(albums.id, albumId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Resolve cover path to absolute path and get file info
   */
  private async resolveCoverPath(coverPath: string, source: 'local' | 'external'): Promise<CachedImageResult> {
    let fullPath: string;

    if (path.isAbsolute(coverPath)) {
      // Already absolute
      fullPath = coverPath;
    } else if (!coverPath.includes('/') && !coverPath.includes('\\')) {
      // Just a filename - in covers cache
      fullPath = path.join(this.coversPath, coverPath);
      this.logger.debug(`Resolved cover from cache: ${fullPath}`);
    } else {
      // Relative path
      fullPath = coverPath;
    }

    return this.getImageFileInfo(fullPath, source);
  }

  /**
   * Get default album cover
   */
  private async getDefaultCover(): Promise<CachedImageResult> {
    const defaultCoverPath = 'defaults/album-cover-default.png';
    return this.getImageFileInfo(defaultCoverPath, 'local');
  }

  /**
   * Get file info for an image
   */
  private async getImageFileInfo(filePath: string, source: 'local' | 'external'): Promise<CachedImageResult> {
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
