/**
 * GetArtistAlbumsInput - Input DTO for getting albums by artist
 */
export interface GetArtistAlbumsInput {
  artistId: string;
  skip?: number;
  take?: number;
}

/**
 * GetArtistAlbumsOutput - Output DTO for artist albums
 */
export interface GetArtistAlbumsOutput {
  data: Array<{
    id: string;
    name: string;
    artistId?: string;
    artistName?: string;
    coverArtPath?: string;
    year?: number;
    songCount: number;
    duration: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}
