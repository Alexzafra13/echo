/**
 * Input DTO for GetArtistStatsUseCase
 */
export interface GetArtistStatsInput {
  artistId: string;
}

/**
 * Output DTO for GetArtistStatsUseCase
 */
export interface GetArtistStatsOutput {
  artistId: string;
  totalPlays: number;
  uniqueListeners: number;
  avgCompletionRate: number;
  skipRate: number;
}
