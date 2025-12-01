import { IAgent } from './agent.interface';
import { ArtistImages } from '../entities/artist-images.entity';

/**
 * Interface for agents that can retrieve artist images
 * @example Last.fm, Fanart.tv (backgrounds, banners, logos)
 */
export interface IArtistImageRetriever extends IAgent {
  /**
   * Retrieve artist images from external service
   * @param mbid MusicBrainz ID (optional, preferred)
   * @param name Artist name (fallback for search)
   * @returns ArtistImages entity or null if not found
   */
  getArtistImages(
    mbid: string | null,
    name: string
  ): Promise<ArtistImages | null>;
}
