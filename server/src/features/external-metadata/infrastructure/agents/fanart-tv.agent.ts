import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IArtistImageRetriever } from '../../domain/interfaces';
import { ArtistImages } from '../../domain/entities';
import { RateLimiterService } from '../services/rate-limiter.service';

/**
 * Fanart.tv Agent
 * Retrieves high-quality artist images, backgrounds, banners, and logos
 *
 * API Documentation: https://fanart.tv/api-docs/
 * Rate Limit: ~4 requests per second (conservative estimate)
 * Authentication: API Key required (free tier: 2 requests/sec, VIP: 10 requests/sec)
 */
@Injectable()
export class FanartTvAgent implements IArtistImageRetriever {
  readonly name = 'fanart';
  readonly priority = 10; // Primary source for backgrounds, banners, logos

  private readonly logger = new Logger(FanartTvAgent.name);
  private readonly baseUrl = 'https://webservice.fanart.tv/v3/music';
  private readonly apiKey: string;
  private readonly enabled: boolean;

  constructor(
    private readonly rateLimiter: RateLimiterService,
    private readonly config: ConfigService
  ) {
    this.apiKey = this.config.get<string>('FANART_API_KEY', '');
    this.enabled = this.config.get<boolean>('FANART_ENABLED', true) && !!this.apiKey;

    if (!this.apiKey) {
      this.logger.warn('Fanart.tv API key not configured. Agent will be disabled.');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get artist images from Fanart.tv
   * Includes HD backgrounds, banners, logos, and thumbnails
   *
   * @param mbid MusicBrainz Artist ID (required by Fanart.tv)
   * @param name Artist name (for logging only)
   * @returns ArtistImages with all available assets or null
   */
  async getArtistImages(
    mbid: string | null,
    name: string
  ): Promise<ArtistImages | null> {
    if (!mbid) {
      this.logger.debug(`No MBID provided for artist: ${name}. Fanart.tv requires MBID.`);
      return null;
    }

    try {
      await this.rateLimiter.waitForRateLimit(this.name);

      const url = `${this.baseUrl}/${mbid}`;
      this.logger.debug(`Fetching Fanart.tv data for: ${name} (${mbid})`);

      const response = await fetch(url, {
        headers: {
          'api-key': this.apiKey,
          'User-Agent': 'Echo-Music-Server/1.0.0',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.debug(`No Fanart.tv data found for: ${name}`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract different image types
      const artistThumb = this.selectBestImage(data.artistthumb);
      const hdBackground = this.selectBestImage(data.artistbackground);
      const banner = this.selectBestImage(data.musicbanner);
      const logo = this.selectBestImage(data.hdmusiclogo || data.musiclogo);

      // For profile images, use thumbnails as small/medium/large
      const smallUrl = artistThumb || null;
      const mediumUrl = artistThumb || null;
      const largeUrl = artistThumb || null;

      // For Hero section and artist pages
      const backgroundUrl = hdBackground || null;
      const bannerUrl = banner || null;
      const logoUrl = logo || null;

      // Check if we have at least one image
      if (!smallUrl && !backgroundUrl && !bannerUrl && !logoUrl) {
        this.logger.debug(`No valid images found for: ${name}`);
        return null;
      }

      this.logger.log(
        `Retrieved Fanart.tv images for: ${name} ` +
        `(thumb: ${!!artistThumb}, bg: ${!!hdBackground}, banner: ${!!banner}, logo: ${!!logo})`
      );

      return new ArtistImages(
        smallUrl,
        mediumUrl,
        largeUrl,
        backgroundUrl,
        bannerUrl,
        logoUrl,
        this.name
      );
    } catch (error) {
      this.logger.error(
        `Error fetching Fanart.tv data for ${name}: ${(error as Error).message}`,
        (error as Error).stack
      );
      return null;
    }
  }

  /**
   * Select the best image from an array of images
   * Prefers images with more likes and higher resolution
   *
   * @param images Array of image objects from Fanart.tv
   * @returns URL of the best image or null
   */
  private selectBestImage(images: any[] | undefined): string | null {
    if (!images || images.length === 0) {
      return null;
    }

    // Sort by likes (descending)
    const sorted = [...images].sort((a, b) => {
      const likesA = parseInt(a.likes || '0', 10);
      const likesB = parseInt(b.likes || '0', 10);
      return likesB - likesA;
    });

    return sorted[0].url || null;
  }
}
