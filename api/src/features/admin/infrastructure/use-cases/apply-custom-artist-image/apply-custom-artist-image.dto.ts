/**
 * Apply Custom Artist Image DTO
 */

export interface ApplyCustomArtistImageInput {
  customImageId: string;
  artistId: string; // For validation
}

export interface ApplyCustomArtistImageOutput {
  success: boolean;
  message: string;
  imageType: string;
}
