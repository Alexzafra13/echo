/**
 * Apply Custom Album Cover DTO
 */

export interface ApplyCustomAlbumCoverInput {
  albumId: string;
  customCoverId: string;
}

export interface ApplyCustomAlbumCoverOutput {
  success: boolean;
  message: string;
}
