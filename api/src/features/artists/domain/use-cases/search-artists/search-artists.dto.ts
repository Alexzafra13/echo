export interface SearchArtistsInput {
  query: string;
  skip?: number;
  take?: number;
}

export interface SearchArtistsOutput {
  data: Array<{
    id: string;
    name: string;
    albumCount: number;
    songCount: number;
    mbzArtistId?: string;
    biography?: string;
    smallImageUrl?: string;
    mediumImageUrl?: string;
    largeImageUrl?: string;
    externalUrl?: string;
    externalInfoUpdatedAt?: Date;
    orderArtistName?: string;
    size: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
  query: string;
}
