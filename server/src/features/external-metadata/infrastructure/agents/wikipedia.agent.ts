import { Injectable, Logger } from '@nestjs/common';
import { IArtistBioRetriever } from '../../domain/interfaces';
import { ArtistBio } from '../../domain/entities';
import { RateLimiterService } from '../services/rate-limiter.service';
import { fetchWithTimeout } from '@shared/utils';

/**
 * Wikipedia Agent
 * Retrieves artist biographies from Wikipedia in multiple languages
 *
 * API Documentation: https://www.mediawiki.org/wiki/API:Main_page
 * Rate Limit: 200 requests/second for bots (we use 100ms delay to be respectful)
 * Authentication: None required (public API)
 *
 * Features:
 * - Multi-language support (Spanish → English fallback)
 * - Free, no API key required
 * - Rich biographical content
 */
@Injectable()
export class WikipediaAgent implements IArtistBioRetriever {
  readonly name = 'wikipedia';
  readonly priority = 10; // Primary source for biographies

  private readonly logger = new Logger(WikipediaAgent.name);
  private readonly userAgent = 'Echo-Music-Server/1.0.0 (Wikipedia Biography Retrieval)';

  // Language priority order
  private readonly languages = ['es', 'en'];

  constructor(private readonly rateLimiter: RateLimiterService) {}

  isEnabled(): boolean {
    return true; // Always enabled - no API key required
  }

  /**
   * Get artist biography from Wikipedia
   * Tries Spanish first, then English as fallback
   *
   * @param mbid MusicBrainz Artist ID (not used for Wikipedia)
   * @param name Artist name
   * @returns ArtistBio or null if not found
   */
  async getArtistBio(mbid: string | null, name: string): Promise<ArtistBio | null> {
    // Try each language in priority order
    for (const lang of this.languages) {
      try {
        this.logger.debug(`Searching Wikipedia (${lang}) for: ${name}`);
        const bio = await this.getBioInLanguage(name, lang);

        if (bio) {
          this.logger.log(`Retrieved biography for ${name} from Wikipedia (${lang})`);
          return bio;
        }
      } catch (error) {
        this.logger.warn(
          `Error fetching ${lang} Wikipedia for ${name}: ${(error as Error).message}`
        );
        // Continue to next language
      }
    }

    this.logger.debug(`No Wikipedia biography found for: ${name}`);
    return null;
  }

  /**
   * Get biography in specific language
   * @param artistName Artist name to search
   * @param lang Language code (es, en, etc.)
   * @returns ArtistBio or null
   */
  private async getBioInLanguage(
    artistName: string,
    lang: string
  ): Promise<ArtistBio | null> {
    await this.rateLimiter.waitForRateLimit(this.name);

    // Step 1: Search for the article
    const pageTitle = await this.searchArticle(artistName, lang);
    if (!pageTitle) {
      return null;
    }

    // Step 2: Get article summary
    await this.rateLimiter.waitForRateLimit(this.name);
    const summary = await this.getArticleSummary(pageTitle, lang);
    if (!summary) {
      return null;
    }

    return summary;
  }

  /**
   * Search for Wikipedia article using OpenSearch API
   * @param query Search query
   * @param lang Language code
   * @returns Page title or null if not found
   */
  private async searchArticle(query: string, lang: string): Promise<string | null> {
    const baseUrl = `https://${lang}.wikipedia.org/w/api.php`;
    const params = new URLSearchParams({
      action: 'opensearch',
      search: query,
      limit: '1',
      namespace: '0', // Main namespace only
      format: 'json',
    });

    const url = `${baseUrl}?${params.toString()}`;
    const response = await fetchWithTimeout(url, {
        timeout: 8000, // 8 second timeout
      headers: { 'User-Agent': this.userAgent },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // OpenSearch returns: [query, [titles], [descriptions], [urls]]
    if (Array.isArray(data) && data[1] && data[1].length > 0) {
      return data[1][0]; // First result title
    }

    return null;
  }

  /**
   * Get article summary using REST API
   * @param title Page title
   * @param lang Language code
   * @returns ArtistBio or null
   */
  private async getArticleSummary(title: string, lang: string): Promise<ArtistBio | null> {
    const baseUrl = `https://${lang}.wikipedia.org/api/rest_v1`;
    const encodedTitle = encodeURIComponent(title);
    const url = `${baseUrl}/page/summary/${encodedTitle}`;

    const response = await fetchWithTimeout(url, {
        timeout: 8000, // 8 second timeout
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Page not found
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Check if it's a disambiguation page or not an article
    if (data.type !== 'standard') {
      this.logger.debug(`Skipping non-standard page: ${title} (type: ${data.type})`);
      return null;
    }

    const extract = data.extract || '';
    if (!extract || extract.trim().length === 0) {
      return null;
    }

    // Wikipedia REST API provides clean text without HTML
    const content = this.cleanContent(extract);
    const pageUrl = data.content_urls?.desktop?.page || null;

    return new ArtistBio(
      content,
      null, // Wikipedia doesn't provide separate summary
      pageUrl,
      this.name
    );
  }

  /**
   * Clean and format Wikipedia content
   * @param text Raw text from Wikipedia
   * @returns Cleaned text
   */
  private cleanContent(text: string): string {
    return text
      // Remove pronunciation guides like "(pronunciación: ...)"
      .replace(/\s*\([^)]*pronunciación[^)]*\)/gi, '')
      // Remove parenthetical dates at start (common in Spanish)
      .replace(/^\s*\([^)]+\)\s*/, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }
}
