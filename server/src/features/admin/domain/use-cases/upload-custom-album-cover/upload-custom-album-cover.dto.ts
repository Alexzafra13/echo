/**
 * Upload Custom Album Cover DTO
 */

export interface UploadCustomAlbumCoverInput {
  albumId: string;
  file: {
    buffer: Buffer;
    mimetype: string;
    size: number;
    originalname: string;
  };
  uploadedBy?: string;
}

export interface UploadCustomAlbumCoverOutput {
  success: boolean;
  message: string;
  customCoverId: string;
  filePath: string;
  url: string;
}
