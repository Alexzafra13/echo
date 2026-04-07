export interface GetUserTopPlayedAlbumsInput {
  userId: string;
  take?: number;
}

export type { AlbumOutput as GetUserTopPlayedAlbumsOutput } from '../get-top-played-albums/get-top-played-albums.dto';
