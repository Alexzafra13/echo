/**
 * Delete Custom Artist Image DTO
 */

export interface DeleteCustomArtistImageInput {
  customImageId: string;
  artistId: string; // For validation
}

export interface DeleteCustomArtistImageOutput {
  success: boolean;
  message: string;
}
