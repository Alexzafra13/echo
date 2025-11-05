import { IAgent } from './agent.interface';
import { AlbumCover } from '../entities/album-cover.entity';

/**
 * Interface for agents that can retrieve album cover art
 * @example Cover Art Archive provides official releases covers
 */
export interface IAlbumCoverRetriever extends IAgent {
  /**
   * Retrieve album cover art from external service
   * @param mbid MusicBrainz Release ID (optional, preferred)
   * @param artist Artist name (fallback for search)
   * @param album Album name (fallback for search)
   * @returns AlbumCover entity or null if not found
   */
  getAlbumCover(
    mbid: string | null,
    artist: string,
    album: string
  ): Promise<AlbumCover | null>;
}
