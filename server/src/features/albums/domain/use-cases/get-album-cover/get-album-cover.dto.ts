export interface GetAlbumCoverInput {
  albumId: string;
}

export interface GetAlbumCoverOutput {
  buffer: Buffer;
  mimeType: string;
  fileSize: number;
}
