import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IArtistBioRetriever, IArtistImageRetriever } from '../../domain/interfaces';
import { ArtistBio, ArtistImages } from '../../domain/entities';
import { RateLimiterService } from '../services/rate-limiter.service';
import { SettingsService } from '../services/settings.service';
import { fetchWithTimeout } from '@shared/utils';
import { ExternalApiError } from '@shared/errors';
import {
  LastFMArtistResponse,
  LastFMArtistInfoResponse,
  LastFMTag,
  LastFMImage,
  LastFMSimilarArtist,
  LastFMSimilarArtistsResponse,
} from './types';

/**
 * Artist genre tag from Last.fm (exported for external use)
 */
export interface LastfmTag {
  name: string;
  count: number;
}

/**
 * Similar artist from Last.fm (exported for external use)
 */
export interface LastfmSimilarArtist {
  name: string;
  mbid: string | null;
  match: number; // 0-1 score
  url: string | null;
}

/**
 * Last.fm Agent
 * Retrieves artist biographies, images, and genre tags from Last.fm API
 *
 * API Documentation: https://www.last.fm/api
 * Rate Limit: 5 requests per second (we use 200ms delay to be safe)
 * Authentication: API Key required (free tier available)
 *
 * Features:
 * - Multi-language biography support (Spanish preferred, English fallback)
 * - Genre/tag extraction for artists
 * - Higher priority than Wikipedia when configured
 *
 * Settings priority: Database (UI) > Environment variable (.env)
 */
@Injectable()
export class LastfmAgent implements IArtistBioRetriever, IArtistImageRetriever, OnModuleInit {
  readonly name = 'lastfm';

  // Dynamic priority: 5 when enabled (higher than Wikipedia's 10), 100 when disabled
  get priority(): number {
    return this.enabled ? 5 : 100;
  }

  private readonly logger = new Logger(LastfmAgent.name);
  private readonly baseUrl = 'https://ws.audioscrobbler.com/2.0/';
  private apiKey: string = '';
  private enabled: boolean = false;

  // Language priority for biographies (Spanish first, then English)
  private readonly bioLanguages = ['es', 'en'];

  constructor(
    private readonly rateLimiter: RateLimiterService,
    private readonly settingsService: SettingsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadSettings();
  }

  /**
   * Load settings from database
   * Note: Frontend uses 'metadata.lastfm.api_key' format
   */
  async loadSettings(): Promise<void> {
    // Check both key formats (frontend uses metadata.X, legacy uses api.X)
    this.apiKey = await this.settingsService.getString('metadata.lastfm.api_key', '') ||
                  await this.settingsService.getString('api.lastfm.api_key', '');

    const dbEnabled = await this.settingsService.getBoolean('metadata.lastfm.enabled', true) &&
                      await this.settingsService.getBoolean('api.lastfm.enabled', true);
    this.enabled = dbEnabled && !!this.apiKey;

    if (!this.apiKey) {
      this.logger.warn('Last.fm API key not configured. Agent will be disabled.');
    } else {
      this.logger.log(`Last.fm agent initialized (enabled: ${this.enabled}, priority: ${this.priority})`);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get artist biography from Last.fm
   * Tries Spanish first, then English as fallback
   *
   * @param mbid MusicBrainz Artist ID
   * @param name Artist name
   * @returns ArtistBio or null if not found
   */
  async getArtistBio(mbid: string | null, name: string): Promise<ArtistBio | null> {
    // Try each language in priority order
    for (const lang of this.bioLanguages) {
      try {
        const artistInfo = await this.getArtistInfo(mbid, name, lang);
        if (!artistInfo?.bio) {
          continue;
        }

        const bio = artistInfo.bio;
        const content = this.cleanHtml(bio.content || '');
        const summary = this.cleanHtml(bio.summary || '');

        // Skip if no content or content is too short (likely just a stub)
        if (!content || content.length < 50) {
          this.logger.debug(`Biography too short for ${name} in ${lang}, trying next language`);
          continue;
        }

        this.logger.log(`Retrieved ${lang.toUpperCase()} biography for artist: ${name}`);

        return new ArtistBio(
          content,
          summary || null,
          artistInfo.url || null,
          this.name
        );
      } catch (error) {
        this.logger.debug(`Error fetching ${lang} biography for ${name}: ${(error as Error).message}`);
        // Continue to next language
      }
    }

    this.logger.debug(`No biography found for: ${name} in any language`);
    return null;
  }

  /**
   * Get artist genre tags from Last.fm
   * Last.fm tags are user-generated and often more accurate/realistic than MusicBrainz
   *
   * @param mbid MusicBrainz Artist ID
   * @param name Artist name
   * @returns Array of genre tags sorted by popularity, or null if not found
   */
  async getArtistTags(mbid: string | null, name: string): Promise<LastfmTag[] | null> {
    try {
      const artistInfo = await this.getArtistInfo(mbid, name);
      if (!artistInfo?.tags?.tag) {
        return null;
      }

      const tags = artistInfo.tags.tag;

      // Handle both array and single tag object
      const tagArray = Array.isArray(tags) ? tags : [tags];

      // Parse and filter tags
      const parsedTags: LastfmTag[] = tagArray
        .filter((t: LastFMTag) => t.name && typeof t.name === 'string')
        .map((t: LastFMTag) => ({
          name: t.name.trim(),
          count: parseInt(t.count || '0', 10),
        }))
        // Filter out non-genre tags (years, locations, etc.)
        .filter((t: LastfmTag) => !this.isNonGenreTag(t.name))
        // Sort by count (popularity)
        .sort((a: LastfmTag, b: LastfmTag) => b.count - a.count)
        // Limit to top 10
        .slice(0, 10);

      if (parsedTags.length === 0) {
        return null;
      }

      this.logger.log(`Retrieved ${parsedTags.length} tags for artist: ${name}`);
      return parsedTags;
    } catch (error) {
      this.logger.error(
        `Error fetching tags for ${name}: ${(error as Error).message}`,
        (error as Error).stack
      );
      return null;
    }
  }

  /**
   * Check if a tag is likely NOT a genre (years, locations, etc.)
   */
  private isNonGenreTag(tag: string): boolean {
    const lowered = tag.toLowerCase();

    // Filter out years (e.g., "2000s", "80s", "1990")
    if (/^\d{2,4}s?$/.test(tag)) return true;

    // Filter out common non-genre tags
    const nonGenreTags = [
      'seen live', 'favorites', 'favourite', 'favorite', 'my music',
      'all time favorite', 'amazing', 'awesome', 'best', 'love',
      'loved', 'great', 'good', 'cool', 'nice', 'beautiful',
      'spotify', 'itunes', 'last.fm', 'soundcloud',
      'usa', 'uk', 'british', 'american', 'swedish', 'german', 'french',
      'canadian', 'australian', 'japanese', 'korean',
      'male vocalists', 'female vocalists', 'singer-songwriter',
      'under 2000 listeners', 'check out',
    ];

    return nonGenreTags.some(nt => lowered.includes(nt));
  }

  /**
   * Get artist images from Last.fm
   * NOTE: Last.fm deprecated artist images in 2020, this usually returns empty
   * Use Fanart.tv for images instead
   *
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
      const images: LastFMImage[] = artistInfo.image;
      const getImageUrl = (size: string): string | null => {
        const img = images.find((i: LastFMImage) => i.size === size);
        const url = img && img['#text'] ? img['#text'] : null;
        // Filter out placeholder images (empty or default star image)
        if (!url || url.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          return null;
        }
        return url;
      };

      const smallUrl = getImageUrl('medium'); // 64x64
      const mediumUrl = getImageUrl('large'); // 174x174
      const largeUrl = getImageUrl('extralarge') || getImageUrl('mega'); // 300x300 or larger

      // Last.fm doesn't provide background/banner/logo - only profile images
      // Also, Last.fm deprecated images in 2020, so most will be null
      if (!smallUrl && !mediumUrl && !largeUrl) {
        this.logger.debug(`No valid images found for: ${name} (Last.fm deprecated images)`);
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
   * @param lang Language code for biography (es, en, de, fr, it, ja, pl, pt, ru, sv, tr, zh)
   * @returns Artist info object or null
   */
  private async getArtistInfo(
    mbid: string | null,
    name: string,
    lang?: string
  ): Promise<LastFMArtistResponse | null> {
    await this.rateLimiter.waitForRateLimit(this.name);

    const params = new URLSearchParams({
      method: 'artist.getinfo',
      api_key: this.apiKey,
      format: 'json',
      autocorrect: '1',
    });

    // Add language parameter for localized biography
    if (lang) {
      params.append('lang', lang);
    }

    // Prefer MBID lookup, fallback to name
    if (mbid) {
      params.append('mbid', mbid);
    } else {
      params.append('artist', name);
    }

    const url = `${this.baseUrl}?${params.toString()}`;
    this.logger.debug(`Fetching Last.fm artist info: ${mbid || name}${lang ? ` (lang: ${lang})` : ''}`);

    const response = await fetchWithTimeout(url, {
        timeout: 8000, // 8 second timeout
      headers: {
        'User-Agent': 'Echo-Music-Server/1.0.0',
      },
    });

    if (!response.ok) {
      throw new ExternalApiError('Last.fm', response.status, response.statusText);
    }

    const data: LastFMArtistInfoResponse = await response.json();

    if (data.error) {
      this.logger.debug(`Last.fm error for ${name}: ${data.message}`);
      return null;
    }

    return data.artist || null;
  }

  /**
   * Get similar artists from Last.fm
   * Uses the artist.getSimilar API endpoint
   *
   * @param mbid MusicBrainz Artist ID
   * @param name Artist name
   * @param limit Max number of similar artists to return (default 30)
   * @returns Array of similar artists sorted by match score, or null if not found
   */
  async getSimilarArtists(
    mbid: string | null,
    name: string,
    limit: number = 30,
  ): Promise<LastfmSimilarArtist[] | null> {
    if (!this.enabled) {
      this.logger.debug('Last.fm agent disabled, skipping getSimilarArtists');
      return null;
    }

    try {
      await this.rateLimiter.waitForRateLimit(this.name);

      const params = new URLSearchParams({
        method: 'artist.getsimilar',
        api_key: this.apiKey,
        format: 'json',
        autocorrect: '1',
        limit: limit.toString(),
      });

      // Prefer MBID lookup, fallback to name
      if (mbid) {
        params.append('mbid', mbid);
      } else {
        params.append('artist', name);
      }

      const url = `${this.baseUrl}?${params.toString()}`;
      this.logger.debug(`Fetching Last.fm similar artists for: ${mbid || name}`);

      const response = await fetchWithTimeout(url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Echo-Music-Server/1.0.0',
        },
      });

      if (!response.ok) {
        throw new ExternalApiError('Last.fm', response.status, response.statusText);
      }

      const data: LastFMSimilarArtistsResponse = await response.json();

      if (data.error) {
        this.logger.debug(`Last.fm error for similar artists ${name}: ${data.message}`);
        return null;
      }

      const artists = data.similarartists?.artist;
      if (!artists) {
        return null;
      }

      // Handle both array and single artist object
      const artistArray: LastFMSimilarArtist[] = Array.isArray(artists) ? artists : [artists];

      // Parse and return similar artists
      const parsedArtists: LastfmSimilarArtist[] = artistArray
        .filter((a) => a.name && typeof a.name === 'string')
        .map((a) => ({
          name: a.name.trim(),
          mbid: a.mbid || null,
          match: parseFloat(a.match || '0'),
          url: a.url || null,
        }))
        .sort((a, b) => b.match - a.match);

      this.logger.log(`Retrieved ${parsedArtists.length} similar artists for: ${name}`);
      return parsedArtists;
    } catch (error) {
      this.logger.error(
        `Error fetching similar artists for ${name}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return null;
    }
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
      // Remove "Read more on Last.fm" footer (multiple languages)
      .replace(/\s*Read more on Last\.fm\.?\s*$/i, '')
      .replace(/\s*Leer más en Last\.fm\.?\s*$/i, '')
      .replace(/\s*Lee más en Last\.fm\.?\s*$/i, '')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
}
