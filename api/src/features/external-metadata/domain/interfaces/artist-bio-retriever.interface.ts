import { IAgent } from './agent.interface';
import { ArtistBio } from '../entities/artist-bio.entity';

/**
 * Interface for agents that can retrieve artist biographies
 * @example Last.fm provides rich HTML biographies
 */
export interface IArtistBioRetriever extends IAgent {
  /**
   * Retrieve artist biography from external service
   * @param mbid MusicBrainz ID (optional, preferred)
   * @param name Artist name (fallback for search)
   * @returns ArtistBio entity or null if not found
   */
  getArtistBio(
    mbid: string | null,
    name: string
  ): Promise<ArtistBio | null>;
}
