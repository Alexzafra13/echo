import { Injectable} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { MusicBrainzAgent } from '../../agents/musicbrainz.agent';
import { MbidSearchCacheService } from '../mbid-search-cache.service';

/**
 * Search result from MusicBrainz with normalized format
 */
export interface MbidMatch {
  mbid: string;
  name: string;
  score: number;
  details: Record<string, any>;
}

/**
 * Service for executing MBID searches with caching
 * Handles interaction with MusicBrainz API and search cache
 */
@Injectable()
export class MbidSearchExecutorService {
  constructor(
    @InjectPinoLogger(MbidSearchExecutorService.name)
    private readonly logger: PinoLogger,
    private readonly musicBrainzAgent: MusicBrainzAgent,
    private readonly searchCache: MbidSearchCacheService,
  ) {}

  /**
   * Search for artist in MusicBrainz (with cache)
   */
  async searchArtist(artistName: string, limit = 10): Promise<MbidMatch[]> {
    this.logger.debug(`Searching MBID for artist: ${artistName}`);

    // Try cache first
    const cached = await this.searchCache.get(artistName, 'artist');
    if (cached) {
      this.logger.debug(`Using cached results for artist: ${artistName}`);
      return this.formatArtistMatches(cached);
    }

    // Search MusicBrainz
    const matches = await this.musicBrainzAgent.searchArtist(artistName, limit);

    if (!matches || matches.length === 0) {
      this.logger.debug(`No MBID matches found for artist: ${artistName}`);
      return [];
    }

    // Cache results (TTL: 7 days)
    await this.searchCache.set({
      queryText: artistName,
      queryType: 'artist',
      results: matches,
      resultCount: matches.length,
    });

    return this.formatArtistMatches(matches);
  }

  /**
   * Search for album in MusicBrainz (with cache)
   */
  async searchAlbum(albumName: string, artistName: string, limit = 10): Promise<MbidMatch[]> {
    this.logger.debug(`Searching MBID for album: "${albumName}" by ${artistName}`);

    const cacheKey = `${albumName}|${artistName}`;

    // Try cache first
    const cached = await this.searchCache.get(cacheKey, 'album', { artist: artistName });
    if (cached) {
      this.logger.debug(`Using cached results for album: "${albumName}"`);
      return this.formatAlbumMatches(cached);
    }

    // Search MusicBrainz
    const matches = await this.musicBrainzAgent.searchAlbum(albumName, artistName, limit);

    if (!matches || matches.length === 0) {
      this.logger.debug(`No MBID matches found for album: "${albumName}" by ${artistName}`);
      return [];
    }

    // Cache results
    await this.searchCache.set({
      queryText: cacheKey,
      queryType: 'album',
      queryParams: { artist: artistName },
      results: matches,
      resultCount: matches.length,
    });

    return this.formatAlbumMatches(matches);
  }

  /**
   * Search for track (recording) in MusicBrainz (with cache)
   */
  async searchTrack(
    params: {
      artist: string;
      album?: string;
      title: string;
      trackNumber?: number;
      duration?: number;
    },
    limit = 10,
  ): Promise<MbidMatch[]> {
    this.logger.debug(
      `Searching MBID for track: "${params.title}" by ${params.artist}${params.album ? ` from "${params.album}"` : ''}`,
    );

    const cacheKey = `${params.artist}|${params.title}|${params.album || ''}`;
    const searchParams = {
      artist: params.artist,
      album: params.album,
      trackNumber: params.trackNumber,
      duration: params.duration,
    };

    // Try cache first
    const cached = await this.searchCache.get(cacheKey, 'recording', searchParams);
    if (cached) {
      this.logger.debug(`Using cached results for track: "${params.title}"`);
      return this.formatTrackMatches(cached);
    }

    // Search MusicBrainz
    const matches = await this.musicBrainzAgent.searchRecording(
      {
        artist: params.artist,
        release: params.album,
        recording: params.title,
        trackNumber: params.trackNumber,
        duration: params.duration,
      },
      limit,
    );

    if (!matches || matches.length === 0) {
      this.logger.debug(`No MBID matches found for track: "${params.title}" by ${params.artist}`);
      return [];
    }

    // Cache results
    await this.searchCache.set({
      queryText: cacheKey,
      queryType: 'recording',
      queryParams: searchParams,
      results: matches,
      resultCount: matches.length,
    });

    return this.formatTrackMatches(matches);
  }

  // ============================================
  // PRIVATE HELPERS - Format matches to common interface
  // ============================================

  private formatArtistMatches(matches: any[]): MbidMatch[] {
    return matches.slice(0, 5).map((match) => ({
      mbid: match.mbid,
      name: match.name,
      score: match.score,
      details: {
        sortName: match.sortName,
        disambiguation: match.disambiguation,
        type: match.type,
        country: match.country,
        lifeSpan: match.lifeSpan,
      },
    }));
  }

  private formatAlbumMatches(matches: any[]): MbidMatch[] {
    return matches.slice(0, 5).map((match) => ({
      mbid: match.mbid,
      name: match.title,
      score: match.score,
      details: {
        artistName: match.artistName,
        artistMbid: match.artistMbid,
        primaryType: match.primaryType,
        secondaryTypes: match.secondaryTypes,
        firstReleaseDate: match.firstReleaseDate,
        disambiguation: match.disambiguation,
      },
    }));
  }

  private formatTrackMatches(matches: any[]): MbidMatch[] {
    return matches.slice(0, 5).map((match) => ({
      mbid: match.mbid,
      name: match.title,
      score: match.score,
      details: {
        artistName: match.artistName,
        artistMbid: match.artistMbid,
        length: match.length,
        releases: match.releases,
      },
    }));
  }
}
