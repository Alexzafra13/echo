import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { AgentRegistryService } from '../../infrastructure/services/agent-registry.service';
import {
  IMusicBrainzSearch,
  MusicBrainzArtistMatch,
  MusicBrainzAlbumMatch,
} from '../../domain/interfaces';

/**
 * Service for searching MusicBrainz IDs
 * Handles MBID lookups for both artists and albums
 */
@Injectable()
export class MbidSearchService {
  constructor(
    @InjectPinoLogger(MbidSearchService.name)
    private readonly logger: PinoLogger,
    private readonly agentRegistry: AgentRegistryService
  ) {}

  /**
   * Search for artist MBID in MusicBrainz
   * @returns Array of matches sorted by score
   */
  async searchArtist(artistName: string, limit = 5): Promise<MusicBrainzArtistMatch[]> {
    const mbAgent = this.agentRegistry.getAgentsFor('IMusicBrainzSearch')[0];
    if (!mbAgent || !mbAgent.isEnabled()) {
      this.logger.debug('MusicBrainz search agent not available');
      return [];
    }

    try {
      return await (mbAgent as unknown as IMusicBrainzSearch).searchArtist(artistName, limit);
    } catch (error) {
      this.logger.error(`Error searching MusicBrainz for artist: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Search for album MBID in MusicBrainz
   * @returns Array of matches sorted by score
   */
  async searchAlbum(
    albumTitle: string,
    artistName?: string,
    limit = 5
  ): Promise<MusicBrainzAlbumMatch[]> {
    const mbAgent = this.agentRegistry.getAgentsFor('IMusicBrainzSearch')[0];
    if (!mbAgent || !mbAgent.isEnabled()) {
      this.logger.debug('MusicBrainz search agent not available');
      return [];
    }

    try {
      return await (mbAgent as unknown as IMusicBrainzSearch).searchAlbum(
        albumTitle,
        artistName,
        limit
      );
    } catch (error) {
      this.logger.error(`Error searching MusicBrainz for album: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get artist data by MBID
   */
  async getArtistByMbid(mbid: string): Promise<MusicBrainzArtistMatch | null> {
    const mbAgent = this.agentRegistry.getAgentsFor('IMusicBrainzSearch')[0];
    if (!mbAgent || !mbAgent.isEnabled()) {
      return null;
    }

    try {
      return await (mbAgent as unknown as IMusicBrainzSearch).getArtistByMbid(mbid);
    } catch (error) {
      this.logger.error(`Error fetching artist by MBID: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get album data by MBID
   */
  async getAlbumByMbid(mbid: string): Promise<MusicBrainzAlbumMatch | null> {
    const mbAgent = this.agentRegistry.getAgentsFor('IMusicBrainzSearch')[0];
    if (!mbAgent || !mbAgent.isEnabled()) {
      return null;
    }

    try {
      return await (mbAgent as unknown as IMusicBrainzSearch).getAlbumByMbid(mbid);
    } catch (error) {
      this.logger.error(`Error fetching album by MBID: ${(error as Error).message}`);
      return null;
    }
  }
}
