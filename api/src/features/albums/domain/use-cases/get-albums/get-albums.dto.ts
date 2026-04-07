export interface GetAlbumsInput {
  skip: number;
  take: number;
}

export interface AlbumOutput {
  id: string;
  name: string;
  artistId?: string;
  artistName?: string;
  albumArtistId?: string;
  coverArtPath?: string;
  year?: number;
  releaseDate?: Date;
  compilation: boolean;
  songCount: number;
  duration: number;
  size: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetAlbumsOutput {
  data: AlbumOutput[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}