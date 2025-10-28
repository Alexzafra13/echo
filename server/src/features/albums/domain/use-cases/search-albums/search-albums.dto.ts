export interface SearchAlbumsInput {
  query: string;
  skip: number;
  take: number;
}

export interface SearchAlbumsOutput {
  data: Array<{
    id: string;
    name: string;
    artistId?: string;
    albumArtistId?: string;
    coverArtPath?: string;
    year?: number;
    releaseDate?: Date;
    compilation: boolean;
    songCount: number;
    duration: number;
    size: bigint;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  skip: number;
  take: number;
  query: string;
  hasMore: boolean;
}