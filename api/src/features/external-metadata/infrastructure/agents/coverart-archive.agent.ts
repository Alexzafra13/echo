import { Injectable} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { IAlbumCoverRetriever } from '../../domain/interfaces';
import { AlbumCover } from '../../domain/entities';
import { RateLimiterService } from '../services/rate-limiter.service';
import { fetchWithTimeout } from '@shared/utils';
import { ExternalApiError } from '@shared/errors';

/**
 * Cover Art Archive Agent
 * Retrieves album cover art from coverartarchive.org
 *
 * API Documentation: https://musicbrainz.org/doc/Cover_Art_Archive/API
 * Rate Limit: 1 request per second (shares infrastructure with MusicBrainz)
 * Authentication: None required
 */
@Injectable()
export class CoverArtArchiveAgent implements IAlbumCoverRetriever {
  readonly name = 'coverart';
  readonly priority = 10; // Primary source for album covers
  private readonly baseUrl = 'https://coverartarchive.org';
  private readonly enabled: boolean;

  constructor(
    @InjectPinoLogger(CoverArtArchiveAgent.name)
    private readonly logger: PinoLogger,
    private readonly rateLimiter: RateLimiterService,
    private readonly config: ConfigService
  ) {
    this.enabled = this.config.get<boolean>('COVERART_ENABLED', true);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get album cover art from Cover Art Archive
   * @param mbid MusicBrainz Release ID
   * @param artist Artist name (fallback, not used by this API)
   * @param album Album name (fallback, not used by this API)
   * @returns AlbumCover with three sizes or null if not found
   */
  async getAlbumCover(
    mbid: string | null,
    artist: string,
    album: string
  ): Promise<AlbumCover | null> {
    if (!mbid) {
      this.logger.debug(`No MBID provided for album: ${artist} - ${album}`);
      return null;
    }

    try {
      await this.rateLimiter.waitForRateLimit(this.name);

      const url = `${this.baseUrl}/release/${mbid}`;
      this.logger.debug(`Fetching cover art: ${url}`);

      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Echo-Music-Server/1.0.0 (https://github.com/yourusername/echo)',
          Accept: 'application/json',
        },
        timeout: 8000, // 8 second timeout
      });

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.debug(`No cover art found for MBID: ${mbid}`);
          return null;
        }
        throw new ExternalApiError('CoverArtArchive', response.status, response.statusText);
      }

      const data = await response.json();

      // Find the front cover image
      const frontCover = data.images?.find(
        (img: any) => img.front === true
      ) || data.images?.[0];

      if (!frontCover) {
        this.logger.debug(`No front cover image found for MBID: ${mbid}`);
        return null;
      }

      // Cover Art Archive provides multiple sizes via thumbnails
      const smallUrl = frontCover.thumbnails?.['250'] || frontCover.image;
      const mediumUrl = frontCover.thumbnails?.['500'] || frontCover.image;
      const largeUrl = frontCover.thumbnails?.['1200'] || frontCover.image;

      this.logger.debug(`Retrieved cover art for: ${artist} - ${album}`);

      return new AlbumCover(
        smallUrl,
        mediumUrl,
        largeUrl,
        this.name
      );
    } catch (error) {
      this.logger.error(
        `Error fetching cover art for ${artist} - ${album}: ${(error as Error).message}`,
        (error as Error).stack
      );
      return null;
    }
  }
}
