/**
 * Input DTO for GetArtistTopTracksUseCase
 */
export interface GetArtistTopTracksInput {
  artistId: string;
  limit?: number;
  days?: number;
}

/**
 * Track play data
 */
export interface TrackPlayData {
  trackId: string;
  title: string;
  albumId: string | null;
  albumName: string | null;
  duration: number | null;
  playCount: number;
  uniqueListeners: number;
}

/**
 * Output DTO for GetArtistTopTracksUseCase
 */
export interface GetArtistTopTracksOutput {
  data: TrackPlayData[];
  artistId: string;
  limit: number;
  days?: number;
}
