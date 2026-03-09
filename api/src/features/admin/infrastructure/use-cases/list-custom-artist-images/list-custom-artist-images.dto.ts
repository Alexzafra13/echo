/**
 * List Custom Artist Images DTO
 */

export interface ListCustomArtistImagesInput {
  artistId: string;
  imageType?: 'profile' | 'background' | 'banner' | 'logo';
}

export interface CustomArtistImageItem {
  id: string;
  artistId: string;
  imageType: string;
  filePath: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  isActive: boolean;
  uploadedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  url: string;
}

export interface ListCustomArtistImagesOutput {
  customImages: CustomArtistImageItem[];
  total: number;
}
