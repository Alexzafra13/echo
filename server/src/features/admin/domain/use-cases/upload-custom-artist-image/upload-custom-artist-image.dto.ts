/**
 * Upload Custom Artist Image DTO
 */

export interface UploadCustomArtistImageInput {
  artistId: string;
  imageType: 'profile' | 'background' | 'banner' | 'logo';
  file: Express.Multer.File;
  uploadedBy?: string;
}

export interface UploadCustomArtistImageOutput {
  success: boolean;
  message: string;
  customImageId: string;
  filePath: string;
  url: string;
}
