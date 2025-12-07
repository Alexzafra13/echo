import { Injectable, Logger } from '@nestjs/common';
import {
  IMusicBrainzSearch,
  MusicBrainzArtistMatch,
  MusicBrainzAlbumMatch,
  MusicBrainzRecordingMatch,
} from '../../domain/interfaces/musicbrainz-search.interface';
import { RateLimiterService } from '../services/rate-limiter.service';
import { fetchWithTimeout } from '@shared/utils';
import { ExternalApiError } from '@shared/errors';
import {
  MBArtistResponse,
  MBArtistSearchResponse,
  MBReleaseGroupResponse,
  MBReleaseGroupSearchResponse,
  MBRecordingResponse,
  MBRecordingSearchResponse,
  MBRecordingRelease,
  MBTag,
} from './types';

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

      const response = await fetchWithTimeout(url, {
        timeout: 8000, // 8 second timeout
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new ExternalApiError('MusicBrainz', response.status, response.statusText);
      }

      const data: MBArtistSearchResponse = await response.json();

      // Parse and map results
      const matches: MusicBrainzArtistMatch[] = (data.artists || []).map(
        (artist: MBArtistResponse) => ({
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

      const response = await fetchWithTimeout(url, {
        timeout: 8000, // 8 second timeout
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new ExternalApiError('MusicBrainz', response.status, response.statusText);
      }

      const data: MBReleaseGroupSearchResponse = await response.json();

      // Parse and map results
      const matches: MusicBrainzAlbumMatch[] = (
        data['release-groups'] || []
      ).map((rg: MBReleaseGroupResponse) => ({
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
   * Includes tags (genres/styles) with inc=tags
   */
  async getArtistByMbid(mbid: string): Promise<MusicBrainzArtistMatch | null> {
    try {
      await this.rateLimiter.waitForRateLimit(this.name);

      // Include tags for genre information
      const url = `${this.baseUrl}/artist/${mbid}?inc=tags&fmt=json`;

      this.logger.debug(`Fetching artist details for MBID: ${mbid}`);

      const response = await fetchWithTimeout(url, {
        timeout: 8000, // 8 second timeout
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
        throw new ExternalApiError('MusicBrainz', response.status, response.statusText);
      }

      const artist: MBArtistResponse = await response.json();

      // Parse tags (genres) - only include tags with at least 1 vote
      const tags = (artist.tags || [])
        .filter((tag: MBTag) => tag.count >= 1)
        .map((tag: MBTag) => ({
          name: tag.name,
          count: tag.count,
        }))
        .sort((a: MBTag, b: MBTag) => b.count - a.count); // Sort by popularity

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
        tags: tags.length > 0 ? tags : undefined,
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
   * Includes tags (genres/styles) with inc=tags
   */
  async getAlbumByMbid(mbid: string): Promise<MusicBrainzAlbumMatch | null> {
    try {
      await this.rateLimiter.waitForRateLimit(this.name);

      // Include tags for genre information
      const url = `${this.baseUrl}/release-group/${mbid}?inc=artist-credits+tags&fmt=json`;

      this.logger.debug(`Fetching album details for MBID: ${mbid}`);

      const response = await fetchWithTimeout(url, {
        timeout: 8000, // 8 second timeout
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
        throw new ExternalApiError('MusicBrainz', response.status, response.statusText);
      }

      const rg: MBReleaseGroupResponse = await response.json();

      // Parse tags (genres) - only include tags with at least 1 vote
      const tags = (rg.tags || [])
        .filter((tag: MBTag) => tag.count >= 1)
        .map((tag: MBTag) => ({
          name: tag.name,
          count: tag.count,
        }))
        .sort((a: MBTag, b: MBTag) => b.count - a.count); // Sort by popularity

      return {
        mbid: rg.id,
        title: rg.title,
        artistName: rg['artist-credit']?.[0]?.name || 'Unknown',
        artistMbid: rg['artist-credit']?.[0]?.artist?.id,
        primaryType: rg['primary-type'],
        secondaryTypes: rg['secondary-types'] || [],
        firstReleaseDate: rg['first-release-date'],
        disambiguation: rg.disambiguation,
        tags: tags.length > 0 ? tags : undefined,
        score: 100, // Direct lookup = perfect match
      };
    } catch (error) {
      this.logger.error(
        `Error fetching album MBID ${mbid}: ${(error as Error).message}`
      );
      return null;
    }
  }

  /**
   * Search for recordings (tracks) using multi-field search
   * Inspired by MusicBrainz Picard for high-accuracy matching
   *
   * Uses Lucene query syntax for precise matching:
   * - artist: Artist name
   * - release: Album/Release name
   * - recording: Track/song title
   * - tnum: Track number
   * - dur: Duration (in milliseconds, ±10s tolerance)
   * - isrc: International Standard Recording Code
   *
   * @example
   * searchRecording({
   *   artist: "Radiohead",
   *   release: "OK Computer",
   *   recording: "Karma Police",
   *   trackNumber: 6,
   *   duration: 263
   * })
   */
  async searchRecording(
    params: {
      artist: string;
      release?: string;
      recording: string;
      trackNumber?: number;
      duration?: number; // in seconds
      isrc?: string;
    },
    limit = 5
  ): Promise<MusicBrainzRecordingMatch[]> {
    try {
      await this.rateLimiter.waitForRateLimit(this.name);

      // Build multi-field Lucene query (like Picard)
      const queryParts: string[] = [];

      // Required fields
      queryParts.push(`artist:"${params.artist}"`);
      queryParts.push(`recording:"${params.recording}"`);

      // Optional fields for better accuracy
      if (params.release) {
        queryParts.push(`release:"${params.release}"`);
      }

      if (params.trackNumber) {
        queryParts.push(`tnum:${params.trackNumber}`);
      }

      if (params.duration) {
        // Convert to milliseconds and add ±10s tolerance
        const durationMs = params.duration * 1000;
        const tolerance = 10000; // 10 seconds
        const minDur = durationMs - tolerance;
        const maxDur = durationMs + tolerance;
        queryParts.push(`dur:[${minDur} TO ${maxDur}]`);
      }

      if (params.isrc) {
        queryParts.push(`isrc:${params.isrc}`);
      }

      const query = queryParts.join(' AND ');
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/recording?query=${encodedQuery}&limit=${limit}&fmt=json`;

      this.logger.debug(
        `Searching MusicBrainz for recording: "${params.recording}" by ${params.artist}`
      );
      this.logger.debug(`Query: ${query}`);

      const response = await fetchWithTimeout(url, {
        timeout: 8000, // 8 second timeout
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new ExternalApiError('MusicBrainz', response.status, response.statusText);
      }

      const data: MBRecordingSearchResponse = await response.json();

      // Parse and map results
      const matches: MusicBrainzRecordingMatch[] = (
        data.recordings || []
      ).map((rec: MBRecordingResponse) => {
        // Extract releases information
        const releases = (rec.releases || []).map((rel: MBRecordingRelease) => ({
          mbid: rel.id,
          title: rel.title,
          trackNumber: rel.media?.[0]?.track?.[0]?.number
            ? parseInt(rel.media[0].track[0].number)
            : undefined,
          trackCount: rel.media?.[0]?.['track-count'],
        }));

        return {
          mbid: rec.id,
          title: rec.title,
          artistName: rec['artist-credit']?.[0]?.name || 'Unknown',
          artistMbid: rec['artist-credit']?.[0]?.artist?.id,
          length: rec.length, // in milliseconds
          releases,
          score: rec.score || 0,
        };
      });

      this.logger.debug(
        `Found ${matches.length} recording matches. Top score: ${matches[0]?.score || 0}`
      );

      return matches;
    } catch (error) {
      this.logger.error(
        `Error searching recording "${params.recording}": ${(error as Error).message}`
      );
      return [];
    }
  }
}
