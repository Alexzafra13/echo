import { Injectable} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { IArtistBioRetriever } from '../../domain/interfaces';
import { ArtistBio } from '../../domain/entities';
import { RateLimiterService } from '../services/rate-limiter.service';
import { fetchWithTimeout } from '@shared/utils';
import { ExternalApiError } from '@shared/errors';

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
 * - Music-specific disambiguation (searches with "(band)", "(musician)", etc.)
 * - Content validation to ensure result is about a musician
 * - Free, no API key required
 */
@Injectable()
export class WikipediaAgent implements IArtistBioRetriever {
  readonly name = 'wikipedia';
  readonly priority = 10; // Secondary source (Last.fm is 5 when enabled)
  private readonly userAgent = 'Echo-Music-Server/1.0.0 (Wikipedia Biography Retrieval)';

  // Language priority order
  private readonly languages = ['es', 'en'];

  // Search suffixes to try for disambiguation (in order of preference)
  private readonly musicDisambiguationSuffixes = [
    '(banda)',           // Spanish: band
    '(band)',            // English: band
    '(grupo musical)',   // Spanish: musical group
    '(musical group)',   // English: musical group
    '(músico)',          // Spanish: musician
    '(musician)',        // English: musician
    '(cantante)',        // Spanish: singer
    '(singer)',          // English: singer
    '(rapero)',          // Spanish: rapper
    '(rapper)',          // English: rapper
    '',                  // No suffix (fallback)
  ];

  // Keywords that indicate the article is about a musician/band
  private readonly musicKeywords = [
    // General music terms
    'album', 'álbum', 'disco', 'discografía', 'discography',
    'canción', 'canciones', 'song', 'songs', 'track', 'tracks',
    'sencillo', 'single', 'singles', 'ep', 'lp',
    'gira', 'tour', 'concierto', 'concert', 'live',
    // Genres
    'rock', 'pop', 'metal', 'jazz', 'hip hop', 'hip-hop', 'rap',
    'electrónica', 'electronic', 'indie', 'punk', 'folk', 'blues',
    'reggae', 'soul', 'r&b', 'country', 'clásica', 'classical',
    // Roles
    'banda', 'band', 'grupo', 'group', 'músico', 'musician',
    'cantante', 'singer', 'vocalista', 'vocalist', 'guitarrista', 'guitarist',
    'baterista', 'drummer', 'bajista', 'bassist', 'tecladista', 'keyboardist',
    'compositor', 'songwriter', 'producer', 'productor', 'dj',
    // Record labels and industry
    'sello discográfico', 'record label', 'disquera', 'grammy', 'billboard',
    'mtv', 'spotify', 'música', 'music', 'musical',
  ];

  constructor(@InjectPinoLogger(WikipediaAgent.name)
    private readonly logger: PinoLogger,
    private readonly rateLimiter: RateLimiterService) {}

  isEnabled(): boolean {
    return true; // Always enabled - no API key required
  }

  /**
   * Get artist biography from Wikipedia
   * Tries Spanish first, then English as fallback
   * Uses smart disambiguation to find music-related articles
   *
   * @param mbid MusicBrainz Artist ID (not used for Wikipedia)
   * @param name Artist name
   * @returns ArtistBio or null if not found
   */
  async getArtistBio(mbid: string | null, name: string): Promise<ArtistBio | null> {
    // Try each language in priority order
    for (const lang of this.languages) {
      try {
        this.logger.debug(`Searching Wikipedia (${lang}) for musician: ${name}`);
        const bio = await this.getBioInLanguage(name, lang);

        if (bio) {
          this.logger.debug(`Retrieved biography for ${name} from Wikipedia (${lang})`);
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
   * Tries multiple disambiguation suffixes to find the music article
   *
   * @param artistName Artist name to search
   * @param lang Language code (es, en, etc.)
   * @returns ArtistBio or null
   */
  private async getBioInLanguage(
    artistName: string,
    lang: string
  ): Promise<ArtistBio | null> {
    // Try each disambiguation suffix
    for (const suffix of this.musicDisambiguationSuffixes) {
      const searchQuery = suffix ? `${artistName} ${suffix}` : artistName;

      await this.rateLimiter.waitForRateLimit(this.name);

      // Step 1: Search for the article
      const pageTitle = await this.searchArticle(searchQuery, lang);
      if (!pageTitle) {
        continue;
      }

      // Step 2: Get article summary
      await this.rateLimiter.waitForRateLimit(this.name);
      const summary = await this.getArticleSummary(pageTitle, lang);
      if (!summary) {
        continue;
      }

      // Step 3: Verify it's about a musician
      if (this.isMusicRelatedContent(summary.content)) {
        this.logger.debug(`Found music article for "${artistName}" with suffix "${suffix || 'none'}"`);
        return summary;
      } else {
        this.logger.debug(`Article "${pageTitle}" doesn't appear to be about a musician, trying next suffix`);
      }
    }

    return null;
  }

  /**
   * Check if content appears to be about a musician or band
   * @param content Article content
   * @returns true if content contains music-related keywords
   */
  private isMusicRelatedContent(content: string): boolean {
    const loweredContent = content.toLowerCase();

    // Count how many music keywords are present
    const matchCount = this.musicKeywords.filter(keyword =>
      loweredContent.includes(keyword.toLowerCase())
    ).length;

    // Require at least 2 music keywords for confidence
    const isMusic = matchCount >= 2;

    if (!isMusic) {
      this.logger.debug(`Content has only ${matchCount} music keywords (need 2+)`);
    }

    return isMusic;
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
      limit: '5', // Get more results to find the right one
      namespace: '0', // Main namespace only
      format: 'json',
    });

    const url = `${baseUrl}?${params.toString()}`;
    const response = await fetchWithTimeout(url, {
        timeout: 8000, // 8 second timeout
      headers: { 'User-Agent': this.userAgent },
    });

    if (!response.ok) {
      throw new ExternalApiError('Wikipedia', response.status, response.statusText);
    }

    const data = await response.json();

    // OpenSearch returns: [query, [titles], [descriptions], [urls]]
    if (Array.isArray(data) && data[1] && data[1].length > 0) {
      // Return first result that seems music-related based on title/description
      const titles = data[1] as string[];
      const descriptions = data[2] as string[];

      for (let i = 0; i < titles.length; i++) {
        const title = titles[i];
        const desc = (descriptions[i] || '').toLowerCase();

        // Check if description mentions music
        if (this.titleOrDescSuggestsMusic(title, desc)) {
          return title;
        }
      }

      // Fallback to first result if no music-specific one found
      return titles[0];
    }

    return null;
  }

  /**
   * Check if title or description suggests music content
   */
  private titleOrDescSuggestsMusic(title: string, desc: string): boolean {
    const combined = `${title} ${desc}`.toLowerCase();

    const musicIndicators = [
      'band', 'banda', 'grupo', 'group', 'musician', 'músico',
      'singer', 'cantante', 'album', 'álbum', 'song', 'canción',
      'rock', 'pop', 'metal', 'hip hop', 'rapper', 'dj',
    ];

    return musicIndicators.some(indicator => combined.includes(indicator));
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
      throw new ExternalApiError('Wikipedia', response.status, response.statusText);
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
      // Remove IPA pronunciations
      .replace(/\s*\([^)]*[\/\[].*?[\/\]][^)]*\)/g, '')
      // Remove parenthetical dates at start (common in Spanish)
      .replace(/^\s*\([^)]+\)\s*/, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }
}
