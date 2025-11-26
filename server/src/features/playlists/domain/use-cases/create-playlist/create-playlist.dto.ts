export interface CreatePlaylistInput {
  name: string;
  description?: string;
  coverImageUrl?: string;
  ownerId: string;
  public?: boolean;
  path?: string;
}

export interface CreatePlaylistOutput {
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
