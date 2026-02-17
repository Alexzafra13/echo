import { apiClient } from '@shared/services/api';

export interface CustomArtistImage {
  id: string;
  artistId: string;
  imageType: 'profile' | 'background' | 'banner' | 'logo';
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isActive: boolean;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface ListCustomImagesResponse {
  images: CustomArtistImage[];
  total: number;
}

export interface UploadCustomImageRequest {
  artistId: string;
  imageType: 'profile' | 'background' | 'banner' | 'logo';
  file: File;
}

export interface UploadCustomImageResponse {
  success: boolean;
  message: string;
  customImageId: string;
  filePath: string;
  url: string;
}

export interface ApplyCustomImageRequest {
  artistId: string;
  customImageId: string;
}

export interface ApplyCustomImageResponse {
  success: boolean;
  message: string;
  imageType: string;
}

export interface DeleteCustomImageRequest {
  artistId: string;
  customImageId: string;
}

export interface DeleteCustomImageResponse {
  success: boolean;
  message: string;
}

export const customArtistImagesApi = {
  async listImages(artistId: string): Promise<ListCustomImagesResponse> {
    const response = await apiClient.get<ListCustomImagesResponse>(
      `/admin/metadata/artist/custom-images/${artistId}`,
    );
    return response.data;
  },

  async uploadImage(request: UploadCustomImageRequest): Promise<UploadCustomImageResponse> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('imageType', request.imageType);

    const response = await apiClient.post<UploadCustomImageResponse>(
      `/admin/metadata/artist/custom-images/${request.artistId}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },

  async applyImage(request: ApplyCustomImageRequest): Promise<ApplyCustomImageResponse> {
    const response = await apiClient.post<ApplyCustomImageResponse>(
      `/admin/metadata/artist/custom-images/${request.artistId}/apply/${request.customImageId}`,
    );
    return response.data;
  },

  async deleteImage(request: DeleteCustomImageRequest): Promise<DeleteCustomImageResponse> {
    const response = await apiClient.delete<DeleteCustomImageResponse>(
      `/admin/metadata/artist/custom-images/${request.artistId}/${request.customImageId}`,
    );
    return response.data;
  },
};
