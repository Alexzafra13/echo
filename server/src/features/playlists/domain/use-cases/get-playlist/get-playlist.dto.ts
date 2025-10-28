export interface GetPlaylistInput {
  id: string;
}

export interface GetPlaylistOutput {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  duration: number;
  size: bigint;
  ownerId: string;
  public: boolean;
  songCount: number;
  path?: string;
  sync: boolean;
  createdAt: Date;
  updatedAt: Date;
}
