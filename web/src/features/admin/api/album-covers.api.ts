import { apiClient } from '@shared/services/api';

export interface CoverOption {
  provider: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size?: string;
}

export interface AlbumInfo {
  id: string;
  name: string;
  artistId?: string;
  artistName: string;
  mbzAlbumId?: string;
}

export interface SearchAlbumCoversResponse {
  covers: CoverOption[];
  albumInfo: AlbumInfo;
}

export interface ApplyAlbumCoverRequest {
  albumId: string;
  coverUrl: string;
  provider: string;
}

export interface ApplyAlbumCoverResponse {
  success: boolean;
  message: string;
  coverPath?: string;
}

export const albumCoversApi = {
  async searchCovers(albumId: string): Promise<SearchAlbumCoversResponse> {
    const response = await apiClient.get<SearchAlbumCoversResponse>(
      `/admin/metadata/album/${albumId}/covers/search`,
    );
    return response.data;
  },

  async applyCover(request: ApplyAlbumCoverRequest): Promise<ApplyAlbumCoverResponse> {
    const response = await apiClient.post<ApplyAlbumCoverResponse>(
      '/admin/metadata/album/covers/apply',
      request,
    );
    return response.data;
  },
};
