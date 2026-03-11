import { apiClient } from '@shared/services/api';

export interface UploadRadioFaviconResponse {
  success: boolean;
  message: string;
  imageId: string;
  url: string;
}

export interface AutoFetchRadioFaviconResponse {
  success: boolean;
  source?: string;
  url?: string;
}

export interface FaviconPreview {
  source: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

export interface FetchPreviewsResponse {
  previews: FaviconPreview[];
}

export const radioFaviconsApi = {
  uploadFavicon: async (stationUuid: string, file: File): Promise<UploadRadioFaviconResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<UploadRadioFaviconResponse>(
      `/admin/radio/favicons/${stationUuid}/upload`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return data;
  },

  deleteFavicon: async (stationUuid: string): Promise<void> => {
    await apiClient.delete(`/admin/radio/favicons/${stationUuid}`);
  },

  autoFetch: async (
    stationUuid: string,
    name: string,
    homepage?: string
  ): Promise<AutoFetchRadioFaviconResponse> => {
    const params = new URLSearchParams({ name });
    if (homepage) params.append('homepage', homepage);

    const { data } = await apiClient.post<AutoFetchRadioFaviconResponse>(
      `/admin/radio/favicons/${stationUuid}/auto-fetch?${params.toString()}`
    );
    return data;
  },

  fetchPreviews: async (
    stationUuid: string,
    name: string,
    homepage?: string
  ): Promise<FetchPreviewsResponse> => {
    const params = new URLSearchParams({ name });
    if (homepage) params.append('homepage', homepage);

    const { data } = await apiClient.post<FetchPreviewsResponse>(
      `/admin/radio/favicons/${stationUuid}/previews?${params.toString()}`
    );
    return data;
  },

  savePreview: async (
    stationUuid: string,
    dataUrl: string,
    source: string
  ): Promise<AutoFetchRadioFaviconResponse> => {
    const { data } = await apiClient.post<AutoFetchRadioFaviconResponse>(
      `/admin/radio/favicons/${stationUuid}/save-preview`,
      { dataUrl, source }
    );
    return data;
  },
};
