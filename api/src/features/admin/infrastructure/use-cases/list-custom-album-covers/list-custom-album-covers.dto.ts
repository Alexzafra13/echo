/**
 * List Custom Album Covers DTO
 */

export interface ListCustomAlbumCoversInput {
  albumId: string;
}

export interface CustomAlbumCoverDto {
  id: string;
  albumId: string;
  filePath: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  isActive: boolean;
  uploadedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListCustomAlbumCoversOutput {
  albumId: string;
  albumName: string;
  customCovers: CustomAlbumCoverDto[];
}
