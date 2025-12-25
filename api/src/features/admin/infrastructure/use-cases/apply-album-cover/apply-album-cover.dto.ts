export interface ApplyAlbumCoverInput {
  albumId: string;
  coverUrl: string;
  provider: string;
}

export interface ApplyAlbumCoverOutput {
  success: boolean;
  message: string;
  coverPath?: string;
}
