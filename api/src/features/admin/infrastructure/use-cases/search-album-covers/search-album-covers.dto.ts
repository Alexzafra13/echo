export interface SearchAlbumCoversInput {
  albumId: string;
}

export interface CoverOption {
  provider: string; // 'coverartarchive', 'fanart', etc.
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size?: string; // 'small', 'medium', 'large', 'original'
}

export interface SearchAlbumCoversOutput {
  covers: CoverOption[];
  albumInfo: {
    id: string;
    name: string;
    artistName: string;
    mbzAlbumId?: string;
  };
}
