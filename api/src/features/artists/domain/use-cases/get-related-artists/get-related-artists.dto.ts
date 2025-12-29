/**
 * Input DTO for GetRelatedArtistsUseCase
 */
export interface GetRelatedArtistsInput {
  artistId: string;
  limit?: number;
}

/**
 * Related artist data
 */
export interface RelatedArtistData {
  id: string;
  name: string;
  albumCount: number;
  songCount: number;
  matchScore: number;
}

/**
 * Output DTO for GetRelatedArtistsUseCase
 */
export interface GetRelatedArtistsOutput {
  data: RelatedArtistData[];
  artistId: string;
  limit: number;
  source: 'external' | 'internal' | 'none';
}
