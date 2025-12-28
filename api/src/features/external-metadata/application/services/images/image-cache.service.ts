import { Injectable} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { createHash } from 'crypto';

export interface CachedImageResult {
  filePath: string;
  mimeType: string;
  size: number;
  lastModified: Date;
  source: 'local' | 'external';
  tag: string;
}

/**
 * Service for caching image results with TTL
 * Handles cache management for all image types
 */
@Injectable()
export class ImageCacheService {
  constructor(
    @InjectPinoLogger(ImageCacheService.name)
    private readonly logger: PinoLogger,
  ) {}

  private readonly cache = new Map<string, CachedImageResult>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached image result
   */
  get(key: string): CachedImageResult | undefined {
    const cached = this.cache.get(key);
    if (cached) {
      this.logger.debug(`Cache hit for ${key}`);
    }
    return cached;
  }

  /**
   * Cache an image result with TTL
   */
  set(key: string, result: CachedImageResult): void {
    this.cache.set(key, result);

    // Invalidate cache after TTL
    setTimeout(() => {
      this.cache.delete(key);
      this.logger.debug(`Cache expired for ${key}`);
    }, this.CACHE_TTL_MS);

    this.logger.debug(`Cached ${key} for ${this.CACHE_TTL_MS}ms`);
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.logger.debug(`Cache invalidated for ${key}`);
  }

  /**
   * Invalidate all cache entries for an artist
   */
  invalidateArtist(artistId: string): void {
    const imageTypes = ['profile', 'background', 'banner', 'logo'];
    for (const imageType of imageTypes) {
      this.cache.delete(`artist:${artistId}:${imageType}`);
    }
    this.logger.debug(`Artist cache invalidated for ${artistId}`);
  }

  /**
   * Invalidate album cover cache
   */
  invalidateAlbum(albumId: string): void {
    this.cache.delete(`album:${albumId}:cover`);
    this.logger.debug(`Album cache invalidated for ${albumId}`);
  }

  /**
   * Invalidate user avatar cache
   */
  invalidateUserAvatar(userId: string): void {
    this.cache.delete(`user:${userId}:avatar`);
    this.logger.debug(`User avatar cache invalidated for ${userId}`);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.logger.debug('Image cache cleared');
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Generate a unique tag for cache-busting using MD5
   */
  generateTag(filePath: string, mtime: Date): string {
    return createHash('md5')
      .update(`${filePath}:${mtime.getTime()}`)
      .digest('hex')
      .substring(0, 8);
  }
}
