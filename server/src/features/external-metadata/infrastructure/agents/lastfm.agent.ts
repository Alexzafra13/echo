import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IArtistBioRetriever, IArtistImageRetriever } from '../../domain/interfaces';
import { ArtistBio, ArtistImages } from '../../domain/entities';
import { RateLimiterService } from '../services/rate-limiter.service';
import { fetchWithTimeout } from '@shared/utils';

/**
 * Last.fm Agent
 * Retrieves artist biographies and images from Last.fm API
 *
 * API Documentation: https://www.last.fm/api
 * Rate Limit: 5 requests per second (we use 200ms delay to be safe)
 * Authentication: API Key required (free tier available)
 */
@Injectable()
export class LastfmAgent implements IArtistBioRetriever, IArtistImageRetriever {
  readonly name = 'lastfm';
  readonly priority = 20; // Secondary priority (after primary sources)

  private readonly logger = new Logger(LastfmAgent.name);
  private readonly baseUrl = 'https://ws.audioscrobbler.com/2.0/';
  private readonly apiKey: string;
  private readonly enabled: boolean;

  constructor(
    private readonly rateLimiter: RateLimiterService,
    private readonly config: ConfigService
  ) {
    this.apiKey = this.config.get<string>('LASTFM_API_KEY', '');
    this.enabled = this.config.get<boolean>('LASTFM_ENABLED', true) && !!this.apiKey;

    if (!this.apiKey) {
      this.logger.warn('Last.fm API key not configured. Agent will be disabled.');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get artist biography from Last.fm
   * @param mbid MusicBrainz Artist ID
   * @param name Artist name
   * @returns ArtistBio or null if not found
   */
  async getArtistBio(mbid: string | null, name: string): Promise<ArtistBio | null> {
    try {
      const artistInfo = await this.getArtistInfo(mbid, name);
      if (!artistInfo?.bio) {
        return null;
      }

      const bio = artistInfo.bio;
      const content = this.cleanHtml(bio.content || '');
      const summary = this.cleanHtml(bio.summary || '');

      if (!content || content.length === 0) {
        this.logger.debug(`No biography content found for: ${name}`);
        return null;
      }

      this.logger.log(`Retrieved biography for artist: ${name}`);

      return new ArtistBio(
        content,
        summary || null,
        artistInfo.url || null,
        this.name
      );
    } catch (error) {
      this.logger.error(
        `Error fetching biography for ${name}: ${(error as Error).message}`,
        (error as Error).stack
      );
      return null;
    }
  }

  /**
   * Get artist images from Last.fm
   * @param mbid MusicBrainz Artist ID
   * @param name Artist name
   * @returns ArtistImages or null if not found
   */
  async getArtistImages(
    mbid: string | null,
    name: string
  ): Promise<ArtistImages | null> {
    try {
      const artistInfo = await this.getArtistInfo(mbid, name);
      if (!artistInfo?.image || artistInfo.image.length === 0) {
        return null;
      }

      // Last.fm provides images in sizes: small, medium, large, extralarge, mega
      const images = artistInfo.image;
      const getImageUrl = (size: string): string | null => {
        const img = images.find((i: any) => i.size === size);
        return img && img['#text'] ? img['#text'] : null;
      };

      const smallUrl = getImageUrl('medium'); // 64x64
      const mediumUrl = getImageUrl('large'); // 174x174
      const largeUrl = getImageUrl('extralarge') || getImageUrl('mega'); // 300x300 or larger

      // Last.fm doesn't provide background/banner/logo - only profile images
      if (!smallUrl && !mediumUrl && !largeUrl) {
        this.logger.debug(`No valid images found for: ${name}`);
        return null;
      }

      this.logger.log(`Retrieved images for artist: ${name}`);

      return new ArtistImages(
        smallUrl,
        mediumUrl,
        largeUrl,
        null, // No background
        null, // No banner
        null, // No logo
        this.name
      );
    } catch (error) {
      this.logger.error(
        `Error fetching images for ${name}: ${(error as Error).message}`,
        (error as Error).stack
      );
      return null;
    }
  }

  /**
   * Get artist info from Last.fm API
   * @param mbid MusicBrainz Artist ID
   * @param name Artist name
   * @returns Artist info object or null
   */
  private async getArtistInfo(
    mbid: string | null,
    name: string
  ): Promise<any | null> {
    await this.rateLimiter.waitForRateLimit(this.name);

    const params = new URLSearchParams({
      method: 'artist.getinfo',
      api_key: this.apiKey,
      format: 'json',
      autocorrect: '1',
    });

    // Prefer MBID lookup, fallback to name
    if (mbid) {
      params.append('mbid', mbid);
    } else {
      params.append('artist', name);
    }

    const url = `${this.baseUrl}?${params.toString()}`;
    this.logger.debug(`Fetching Last.fm artist info: ${mbid || name}`);

    const response = await fetchWithTimeout(url, {
        timeout: 8000, // 8 second timeout
      headers: {
        'User-Agent': 'Echo-Music-Server/1.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      this.logger.debug(`Last.fm error for ${name}: ${data.message}`);
      return null;
    }

    return data.artist || null;
  }

  /**
   * Clean HTML tags from Last.fm content
   * Last.fm returns content with HTML tags that need to be cleaned
   * @param html HTML string
   * @returns Clean text
   */
  private cleanHtml(html: string): string {
    if (!html) return '';

    return html
      // Remove <a href="..."> links but keep the text
      .replace(/<a\s+href="[^"]*">([^<]*)<\/a>/gi, '$1')
      // Remove all other HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Remove "Read more on Last.fm" footer
      .replace(/\s*Read more on Last\.fm\.?\s*$/i, '')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
}
