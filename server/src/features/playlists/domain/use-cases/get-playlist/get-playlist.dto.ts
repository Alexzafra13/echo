export interface GetPlaylistInput {
  id: string;
}

export interface GetPlaylistOutput {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  duration: number;
  size: number;
  ownerId: string;
  ownerName?: string;
  ownerHasAvatar?: boolean; // Si el owner tiene avatar
  public: boolean;
  songCount: number;
  path?: string;
  sync: boolean;
  createdAt: Date;
  updatedAt: Date;
}
