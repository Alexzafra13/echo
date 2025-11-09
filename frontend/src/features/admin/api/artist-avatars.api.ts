import { apiClient } from '@shared/services/api';

export interface AvatarOption {
  provider: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  type?: string; // 'profile', 'background', 'banner', 'logo'
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
  type: 'profile' | 'background' | 'banner' | 'logo';
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
};
