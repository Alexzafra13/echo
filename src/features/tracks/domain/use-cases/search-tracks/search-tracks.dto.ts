export interface SearchTracksInput {
  query: string;
  skip?: number;
  take?: number;
}

export interface SearchTracksOutput {
  data: Array<{
    id: string;
    title: string;
    albumId?: string;
    artistId?: string;
    albumArtistId?: string;
    trackNumber?: number;
    discNumber: number;
    year?: number;
    duration?: number;
    path: string;
    bitRate?: number;
    size?: bigint;
    suffix?: string;
    lyrics?: string;
    comment?: string;
    albumName?: string;
    artistName?: string;
    albumArtistName?: string;
    compilation: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
  query: string;
}
