import { apiClient } from '@shared/services/api';

export type AvatarImageType = 'profile' | 'background' | 'banner' | 'logo';

export interface AvatarOption {
  provider: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  type?: AvatarImageType;
}

export interface ArtistInfo {
  id: string;
  name: string;
  mbzArtistId?: string;
}

export interface SearchArtistAvatarsResponse {
  avatars: AvatarOption[];
  artistInfo: ArtistInfo;
}

export interface ApplyArtistAvatarRequest {
  artistId: string;
  avatarUrl: string;
  provider: string;
  type: AvatarImageType;
}

export interface ApplyArtistAvatarResponse {
  success: boolean;
  message: string;
  imagePath?: string;
}

export interface UpdateBackgroundPositionRequest {
  artistId: string;
  backgroundPosition: string;
}

export interface UpdateBackgroundPositionResponse {
  success: boolean;
  message: string;
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

export interface CustomImage {
  id: string;
  artistId: string;
  imageType: 'profile' | 'background' | 'banner' | 'logo';
  filePath: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  isActive: boolean;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListCustomImagesResponse {
  customImages: CustomImage[];
}

export interface ApplyCustomImageRequest {
  artistId: string;
  customImageId: string;
}

export interface ApplyCustomImageResponse {
  success: boolean;
  message: string;
}

export interface DeleteCustomImageRequest {
  artistId: string;
  customImageId: string;
}

export interface DeleteCustomImageResponse {
  success: boolean;
  message: string;
}

export const artistAvatarsApi = {
  /**
   * Buscar todas las imágenes disponibles para un artista
   */
  async searchAvatars(artistId: string): Promise<SearchArtistAvatarsResponse> {
    const response = await apiClient.get<SearchArtistAvatarsResponse>(
      `/admin/metadata/artist/${artistId}/avatars/search`,
    );
    return response.data;
  },

  /**
   * Aplicar una imagen seleccionada
   */
  async applyAvatar(request: ApplyArtistAvatarRequest): Promise<ApplyArtistAvatarResponse> {
    const response = await apiClient.post<ApplyArtistAvatarResponse>(
      '/admin/metadata/artist/avatars/apply',
      request,
    );
    return response.data;
  },

  /**
   * Actualizar la posición del fondo de un artista
   */
  async updateBackgroundPosition(
    request: UpdateBackgroundPositionRequest,
  ): Promise<UpdateBackgroundPositionResponse> {
    const response = await apiClient.patch<UpdateBackgroundPositionResponse>(
      '/admin/metadata/artist/background-position',
      request,
    );
    return response.data;
  },

  /**
   * Subir una imagen personalizada desde el PC
   */
  async uploadCustomImage(request: UploadCustomImageRequest): Promise<UploadCustomImageResponse> {
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

  /**
   * Listar todas las imágenes personalizadas de un artista
   */
  async listCustomImages(artistId: string): Promise<ListCustomImagesResponse> {
    const response = await apiClient.get<ListCustomImagesResponse>(
      `/admin/metadata/artist/custom-images/${artistId}`,
    );
    return response.data;
  },

  /**
   * Aplicar (activar) una imagen personalizada
   */
  async applyCustomImage(request: ApplyCustomImageRequest): Promise<ApplyCustomImageResponse> {
    const response = await apiClient.post<ApplyCustomImageResponse>(
      `/admin/metadata/artist/custom-images/${request.artistId}/apply/${request.customImageId}`,
    );
    return response.data;
  },

  /**
   * Eliminar una imagen personalizada
   */
  async deleteCustomImage(request: DeleteCustomImageRequest): Promise<DeleteCustomImageResponse> {
    const response = await apiClient.delete<DeleteCustomImageResponse>(
      `/admin/metadata/artist/custom-images/${request.artistId}/${request.customImageId}`,
    );
    return response.data;
  },
};
