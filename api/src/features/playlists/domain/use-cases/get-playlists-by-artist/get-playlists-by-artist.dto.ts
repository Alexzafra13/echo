export interface GetPlaylistsByArtistInput {
  artistId: string;
  userId: string;
  skip?: number;
  take?: number;
}

export interface PlaylistByArtistItem {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  duration: number;
  size: number;
  ownerId: string;
  ownerName?: string;
  public: boolean;
  songCount: number;
  albumIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GetPlaylistsByArtistOutput {
  items: PlaylistByArtistItem[];
  total: number;
  skip: number;
  take: number;
}
