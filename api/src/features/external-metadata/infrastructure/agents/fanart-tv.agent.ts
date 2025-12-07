import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IArtistImageRetriever, IAlbumCoverRetriever } from '../../domain/interfaces';
import { ArtistImages, AlbumCover } from '../../domain/entities';
import { RateLimiterService } from '../services/rate-limiter.service';
import { SettingsService } from '../services/settings.service';
import { fetchWithTimeout } from '@shared/utils';
import { ExternalApiError } from '@shared/errors';
import { FanartImage, FanartImageArray, FanartArtistResponse } from './types';

/**
 * Fanart.tv Agent
 * Retrieves high-quality artist images, backgrounds, banners, logos, and album covers
 *
 * API Documentation: https://fanart.tv/api-docs/
 * Rate Limit: ~4 requests per second (conservative estimate)
 * Authentication: API Key required (free tier: 2 requests/sec, VIP: 10 requests/sec)
 *
 * Settings priority: Database (UI) > Environment variable (.env)
 */
@Injectable()
export class FanartTvAgent implements IArtistImageRetriever, IAlbumCoverRetriever, OnModuleInit {
  readonly name = 'fanart';
  readonly priority = 20; // Secondary source for covers (after Cover Art Archive)

  private readonly logger = new Logger(FanartTvAgent.name);
  private readonly baseUrl = 'https://webservice.fanart.tv/v3/music';
  private apiKey: string = '';
  private enabled: boolean = false;

  constructor(
    private readonly rateLimiter: RateLimiterService,
    private readonly settingsService: SettingsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadSettings();
  }

  /**
   * Load settings from database
   * Note: Frontend uses 'metadata.fanart.api_key' format
   */
  async loadSettings(): Promise<void> {
    // Check both key formats (frontend uses metadata.X, legacy uses api.X)
    this.apiKey = await this.settingsService.getString('metadata.fanart.api_key', '') ||
                  await this.settingsService.getString('api.fanart.api_key', '');

    const dbEnabled = await this.settingsService.getBoolean('metadata.fanart.enabled', true) &&
                      await this.settingsService.getBoolean('api.fanart.enabled', true);
    this.enabled = dbEnabled && !!this.apiKey;

    if (!this.apiKey) {
      this.logger.warn('Fanart.tv API key not configured. Agent will be disabled.');
    } else {
      this.logger.log(`Fanart.tv agent initialized (enabled: ${this.enabled})`);
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

      const response = await fetchWithTimeout(url, {
        headers: {
          'api-key': this.apiKey,
          'User-Agent': 'Echo-Music-Server/1.0.0',
        },
        timeout: 8000, // 8 second timeout for external APIs
      });

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.debug(`No Fanart.tv data found for: ${name}`);
          return null;
        }
        throw new ExternalApiError('Fanart.tv', response.status, response.statusText);
      }

      const data = await response.json();

      // Extract different image types
      const artistThumb = this.selectBestImage(data.artistthumb);
      const hdBackground = this.selectBestImage(data.artistbackground);
      const banner = this.selectBestImage(data.musicbanner);
      const logo = this.selectBestImage(data.hdmusiclogo || data.musiclogo);

      // Fanart.tv only has ONE artistthumb size, so we only store it once in largeImageUrl
      // Last.fm will provide the different sizes (small/medium/large)
      const smallUrl = null; // Let Last.fm provide this
      const mediumUrl = null; // Let Last.fm provide this
      const largeUrl = artistThumb || null; // Use artistthumb only for large

      // For Hero section and artist pages
      const backgroundUrl = hdBackground || null;
      const bannerUrl = banner || null;
      const logoUrl = logo || null;

      // Check if we have at least one image
      if (!largeUrl && !backgroundUrl && !bannerUrl && !logoUrl) {
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
   * Get album cover art from Fanart.tv
   * Note: This interface method is not directly usable for Fanart.tv
   * Use getAlbumCoverByArtist() instead, as Fanart.tv requires artist MBID
   *
   * @param mbid MusicBrainz Release-Group ID
   * @param artist Artist name
   * @param album Album name
   * @returns null (not supported without artist MBID)
   */
  async getAlbumCover(
    mbid: string | null,
    artist: string,
    album: string
  ): Promise<AlbumCover | null> {
    this.logger.debug(
      `Fanart.tv album cover lookup requires artist MBID. ` +
      `Use getAlbumCoverByArtist() instead. Skipping for: ${artist} - ${album}`
    );
    return null;
  }

  /**
   * Get ALL album cover variants from Fanart.tv using Artist MBID
   * Returns all available covers for the album (not just the best one)
   *
   * @param artistMbid MusicBrainz Artist ID (required by Fanart.tv)
   * @param albumMbid MusicBrainz Release-Group ID to filter albums
   * @param artistName Artist name (for logging)
   * @param albumName Album name (for logging)
   * @returns Array of all album cover URLs
   */
  async getAllAlbumCoverVariants(
    artistMbid: string,
    albumMbid: string,
    artistName: string,
    albumName: string
  ): Promise<string[] | null> {
    try {
      await this.rateLimiter.waitForRateLimit(this.name);

      const url = `${this.baseUrl}/${artistMbid}`;
      this.logger.debug(`Fetching ALL Fanart.tv album covers: ${artistName} - ${albumName} (artist: ${artistMbid}, album: ${albumMbid})`);

      const response = await fetch(url, {
        headers: {
          'api-key': this.apiKey,
          'User-Agent': 'Echo-Music-Server/1.0.0',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.debug(`No Fanart.tv data found for artist: ${artistName}`);
          return null;
        }
        throw new ExternalApiError('Fanart.tv', response.status, response.statusText);
      }

      const data = await response.json();

      // Fanart.tv returns albums in 'albums' object, keyed by release-group MBID
      if (!data.albums || !data.albums[albumMbid]) {
        this.logger.debug(`No album data found for: ${artistName} - ${albumName} (${albumMbid})`);
        return null;
      }

      const albumData = data.albums[albumMbid];

      // Extract ALL album covers
      const albumCovers = this.getAllImages(albumData.albumcover);

      if (albumCovers.length === 0) {
        this.logger.debug(`No album cover images found for: ${artistName} - ${albumName}`);
        return null;
      }

      this.logger.log(
        `Retrieved ${albumCovers.length} album covers from Fanart.tv for: ${artistName} - ${albumName}`
      );

      return albumCovers;
    } catch (error) {
      this.logger.error(
        `Error fetching Fanart.tv album covers for ${artistName} - ${albumName}: ${(error as Error).message}`,
        (error as Error).stack
      );
      return null;
    }
  }

  /**
   * Get album cover art from Fanart.tv using Artist MBID
   * Fanart.tv organizes all data (including album covers) by artist
   *
   * @param artistMbid MusicBrainz Artist ID (required by Fanart.tv)
   * @param albumMbid MusicBrainz Release-Group ID to filter albums
   * @param artistName Artist name (for logging)
   * @param albumName Album name (for logging)
   * @returns AlbumCover with multiple sizes or null
   */
  async getAlbumCoverByArtist(
    artistMbid: string,
    albumMbid: string,
    artistName: string,
    albumName: string
  ): Promise<AlbumCover | null> {
    try {
      await this.rateLimiter.waitForRateLimit(this.name);

      const url = `${this.baseUrl}/${artistMbid}`;
      this.logger.debug(`Fetching Fanart.tv data for artist to find album: ${artistName} - ${albumName} (artist: ${artistMbid}, album: ${albumMbid})`);

      const response = await fetch(url, {
        headers: {
          'api-key': this.apiKey,
          'User-Agent': 'Echo-Music-Server/1.0.0',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.debug(`No Fanart.tv data found for artist: ${artistName}`);
          return null;
        }
        throw new ExternalApiError('Fanart.tv', response.status, response.statusText);
      }

      const data = await response.json();

      // Fanart.tv returns albums in 'albums' object, keyed by release-group MBID
      if (!data.albums || !data.albums[albumMbid]) {
        this.logger.debug(`No album data found for: ${artistName} - ${albumName} (${albumMbid})`);
        return null;
      }

      const albumData = data.albums[albumMbid];

      // Extract album cover - Fanart.tv returns covers in 'albumcover' array
      const albumCover = this.selectBestImage(albumData.albumcover);

      if (!albumCover) {
        this.logger.debug(`No album cover image found for: ${artistName} - ${albumName}`);
        return null;
      }

      // Fanart.tv album covers come in one size, use it for all sizes
      this.logger.log(
        `Retrieved album cover from Fanart.tv for: ${artistName} - ${albumName}`
      );

      return new AlbumCover(
        albumCover, // small (250px)
        albumCover, // medium (500px)
        albumCover, // large (1200px)
        this.name
      );
    } catch (error) {
      this.logger.error(
        `Error fetching Fanart.tv album cover for ${artistName} - ${albumName}: ${(error as Error).message}`,
        (error as Error).stack
      );
      return null;
    }
  }

  /**
   * Get ALL artist image variants from Fanart.tv
   * Returns all available logos, backgrounds, banners, and thumbs (not just the best one)
   * This allows users to choose from multiple options
   *
   * @param mbid MusicBrainz Artist ID (required by Fanart.tv)
   * @param name Artist name (for logging only)
   * @returns Array of all available image URLs by type
   */
  async getAllArtistImageVariants(
    mbid: string | null,
    name: string
  ): Promise<{
    artistthumbs: string[];
    backgrounds: string[];
    banners: string[];
    logos: string[];
  } | null> {
    if (!mbid) {
      this.logger.debug(`No MBID provided for artist: ${name}. Fanart.tv requires MBID.`);
      return null;
    }

    try {
      await this.rateLimiter.waitForRateLimit(this.name);

      const url = `${this.baseUrl}/${mbid}`;
      this.logger.debug(`Fetching ALL Fanart.tv variants for: ${name} (${mbid})`);

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
        throw new ExternalApiError('Fanart.tv', response.status, response.statusText);
      }

      const data = await response.json();

      // Extract ALL images of each type (sorted by likes)
      const artistthumbs = this.getAllImages(data.artistthumb);
      const backgrounds = this.getAllImages(data.artistbackground);
      const banners = this.getAllImages(data.musicbanner);

      // For logos, prefer HD but include regular logos too
      const hdLogos = this.getAllImages(data.hdmusiclogo);
      const regularLogos = this.getAllImages(data.musiclogo);
      const logos = [...hdLogos, ...regularLogos];

      this.logger.log(
        `Retrieved ALL Fanart.tv variants for: ${name} ` +
        `(thumbs: ${artistthumbs.length}, backgrounds: ${backgrounds.length}, banners: ${banners.length}, logos: ${logos.length})`
      );

      return {
        artistthumbs,
        backgrounds,
        banners,
        logos,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching Fanart.tv variants for ${name}: ${(error as Error).message}`,
        (error as Error).stack
      );
      return null;
    }
  }

  /**
   * Get all images from an array, sorted by likes (descending)
   * @param images Array of image objects from Fanart.tv
   * @returns Array of image URLs sorted by popularity
   */
  private getAllImages(images: FanartImageArray): string[] {
    if (!images || images.length === 0) {
      return [];
    }

    // Sort by likes (descending)
    const sorted = [...images].sort((a: FanartImage, b: FanartImage) => {
      const likesA = parseInt(a.likes || '0', 10);
      const likesB = parseInt(b.likes || '0', 10);
      return likesB - likesA;
    });

    // Return all URLs
    return sorted.map((img: FanartImage) => img.url).filter((url): url is string => !!url);
  }

  /**
   * Select the best image from an array of images
   * Prefers images with more likes and higher resolution
   *
   * @param images Array of image objects from Fanart.tv
   * @returns URL of the best image or null
   */
  private selectBestImage(images: FanartImageArray): string | null {
    if (!images || images.length === 0) {
      return null;
    }

    // Sort by likes (descending)
    const sorted = [...images].sort((a: FanartImage, b: FanartImage) => {
      const likesA = parseInt(a.likes || '0', 10);
      const likesB = parseInt(b.likes || '0', 10);
      return likesB - likesA;
    });

    return sorted[0].url || null;
  }
}
