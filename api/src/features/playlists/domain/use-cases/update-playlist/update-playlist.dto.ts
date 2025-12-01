export interface UpdatePlaylistInput {
  id: string;
  userId: string;
  name?: string;
  description?: string;
  coverImageUrl?: string;
  public?: boolean;
}

export interface UpdatePlaylistOutput {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  duration: number;
  size: number;
  ownerId: string;
  public: boolean;
  songCount: number;
  path?: string;
  sync: boolean;
  createdAt: Date;
  updatedAt: Date;
}
