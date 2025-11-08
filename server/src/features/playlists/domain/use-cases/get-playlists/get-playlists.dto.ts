export interface GetPlaylistsInput {
  ownerId?: string;
  publicOnly?: boolean;
  skip?: number;
  take?: number;
}

export interface PlaylistListItem {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  duration: number;
  size: bigint;
  ownerId: string;
  public: boolean;
  songCount: number;
  albumIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GetPlaylistsOutput {
  items: PlaylistListItem[];
  total: number;
  skip: number;
  take: number;
}
