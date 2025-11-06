import { Injectable, Logger } from '@nestjs/common';
import {
  IMusicBrainzSearch,
  MusicBrainzArtistMatch,
  MusicBrainzAlbumMatch,
} from '../../domain/interfaces/musicbrainz-search.interface';
import { RateLimiterService } from '../services/rate-limiter.service';

/**
 * MusicBrainz Agent
 * Searches for artists and albums in the MusicBrainz database
 *
 * API Documentation: https://musicbrainz.org/doc/MusicBrainz_API
 * Rate Limit: 1 request/second (50 requests in anonymous mode, unlimited for registered apps)
 * Authentication: None required (but recommended for higher limits)
 */
@Injectable()
export class MusicBrainzAgent implements IMusicBrainzSearch {
  readonly name = 'musicbrainz';
  readonly priority = 5; // High priority - authoritative source

  private readonly logger = new Logger(MusicBrainzAgent.name);
  private readonly baseUrl = 'https://musicbrainz.org/ws/2';
  private readonly userAgent = 'Echo-Music-Server/1.0.0 (https://github.com/yourusername/echo)';

  constructor(private readonly rateLimiter: RateLimiterService) {}

  isEnabled(): boolean {
    return true; // Always enabled - free and open API
  }

  /**
   * Search for artists by name
   */
  async searchArtist(
    artistName: string,
    limit = 5
  ): Promise<MusicBrainzArtistMatch[]> {
    try {
      await this.rateLimiter.waitForRateLimit(this.name);

      // Build search query
      const query = encodeURIComponent(`artist:"${artistName}"`);
      const url = `${this.baseUrl}/artist?query=${query}&limit=${limit}&fmt=json`;

      this.logger.debug(`Searching MusicBrainz for artist: ${artistName}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse and map results
      const matches: MusicBrainzArtistMatch[] = (data.artists || []).map(
        (artist: any) => ({
          mbid: artist.id,
          name: artist.name,
          sortName: artist['sort-name'],
          disambiguation: artist.disambiguation,
          type: artist.type,
          country: artist.country,
          lifeSpan: artist['life-span']
            ? {
                begin: artist['life-span'].begin,
                end: artist['life-span'].end,
              }
            : undefined,
          score: artist.score || 0,
        })
      );

      this.logger.debug(
        `Found ${matches.length} artist matches for: ${artistName}`
      );

      return matches;
    } catch (error) {
      this.logger.error(
        `Error searching artist "${artistName}": ${(error as Error).message}`
      );
      return [];
    }
  }

  /**
   * Search for albums (release-groups) by title and artist
   */
  async searchAlbum(
    albumTitle: string,
    artistName?: string,
    limit = 5
  ): Promise<MusicBrainzAlbumMatch[]> {
    try {
      await this.rateLimiter.waitForRateLimit(this.name);

      // Build search query
      let query = `release:"${albumTitle}"`;
      if (artistName) {
        query += ` AND artist:"${artistName}"`;
      }
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/release-group?query=${encodedQuery}&limit=${limit}&fmt=json`;

      this.logger.debug(
        `Searching MusicBrainz for album: ${albumTitle}${artistName ? ` by ${artistName}` : ''}`
      );

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse and map results
      const matches: MusicBrainzAlbumMatch[] = (
        data['release-groups'] || []
      ).map((rg: any) => ({
        mbid: rg.id,
        title: rg.title,
        artistName: rg['artist-credit']?.[0]?.name || 'Unknown',
        artistMbid: rg['artist-credit']?.[0]?.artist?.id,
        primaryType: rg['primary-type'],
        secondaryTypes: rg['secondary-types'] || [],
        firstReleaseDate: rg['first-release-date'],
        disambiguation: rg.disambiguation,
        score: rg.score || 0,
      }));

      this.logger.debug(
        `Found ${matches.length} album matches for: ${albumTitle}`
      );

      return matches;
    } catch (error) {
      this.logger.error(
        `Error searching album "${albumTitle}": ${(error as Error).message}`
      );
      return [];
    }
  }

  /**
   * Get detailed artist information by MBID
   */
  async getArtistByMbid(mbid: string): Promise<MusicBrainzArtistMatch | null> {
    try {
      await this.rateLimiter.waitForRateLimit(this.name);

      const url = `${this.baseUrl}/artist/${mbid}?fmt=json`;

      this.logger.debug(`Fetching artist details for MBID: ${mbid}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.debug(`Artist not found for MBID: ${mbid}`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const artist = await response.json();

      return {
        mbid: artist.id,
        name: artist.name,
        sortName: artist['sort-name'],
        disambiguation: artist.disambiguation,
        type: artist.type,
        country: artist.country,
        lifeSpan: artist['life-span']
          ? {
              begin: artist['life-span'].begin,
              end: artist['life-span'].end,
            }
          : undefined,
        score: 100, // Direct lookup = perfect match
      };
    } catch (error) {
      this.logger.error(
        `Error fetching artist MBID ${mbid}: ${(error as Error).message}`
      );
      return null;
    }
  }

  /**
   * Get detailed album information by MBID
   */
  async getAlbumByMbid(mbid: string): Promise<MusicBrainzAlbumMatch | null> {
    try {
      await this.rateLimiter.waitForRateLimit(this.name);

      const url = `${this.baseUrl}/release-group/${mbid}?inc=artist-credits&fmt=json`;

      this.logger.debug(`Fetching album details for MBID: ${mbid}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.debug(`Album not found for MBID: ${mbid}`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rg = await response.json();

      return {
        mbid: rg.id,
        title: rg.title,
        artistName: rg['artist-credit']?.[0]?.name || 'Unknown',
        artistMbid: rg['artist-credit']?.[0]?.artist?.id,
        primaryType: rg['primary-type'],
        secondaryTypes: rg['secondary-types'] || [],
        firstReleaseDate: rg['first-release-date'],
        disambiguation: rg.disambiguation,
        score: 100, // Direct lookup = perfect match
      };
    } catch (error) {
      this.logger.error(
        `Error fetching album MBID ${mbid}: ${(error as Error).message}`
      );
      return null;
    }
  }
}
