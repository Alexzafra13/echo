/**
 * Delete Custom Album Cover DTO
 */

export interface DeleteCustomAlbumCoverInput {
  albumId: string;
  customCoverId: string;
}

export interface DeleteCustomAlbumCoverOutput {
  success: boolean;
  message: string;
}
