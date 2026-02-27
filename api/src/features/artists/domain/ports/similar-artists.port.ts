/**
 * Port for fetching similar artists from external services
 */
export interface ISimilarArtistsProvider {
  /**
   * Check if the provider is enabled
   */
  isEnabled(): boolean;

  /**
   * Get similar artists for a given artist
   * @param mbzArtistId MusicBrainz artist ID (optional)
   * @param artistName Artist name for fallback search
   * @param limit Maximum number of results
   * @returns Array of similar artists with match score
   */
  getSimilarArtists(
    mbzArtistId: string | null,
    artistName: string,
    limit?: number,
  ): Promise<{ name: string; mbid?: string; match: number }[] | null>;
}

export const SIMILAR_ARTISTS_PROVIDER = 'ISimilarArtistsProvider';
