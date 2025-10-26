export interface GetArtistInput {
  id: string;
}

export interface GetArtistOutput {
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
  size: bigint;
  createdAt: Date;
  updatedAt: Date;
}
