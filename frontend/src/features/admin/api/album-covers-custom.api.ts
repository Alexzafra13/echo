import { apiClient } from '@shared/services/api';

// ============================================
// INTERFACES
// ============================================

export interface UploadCustomCoverRequest {
  albumId: string;
  file: File;
}

export interface UploadCustomCoverResponse {
  success: boolean;
  message: string;
  customCoverId: string;
  filePath: string;
  url: string;
}

export interface CustomCover {
  id: string;
  albumId: string;
  filePath: string;
  fileName: string;
  fileSize: string; // BigInt as string
  mimeType: string;
  isActive: boolean;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListCustomCoversResponse {
  albumId: string;
  albumName: string;
  customCovers: CustomCover[];
}

export interface ApplyCustomCoverRequest {
  albumId: string;
  customCoverId: string;
}

export interface ApplyCustomCoverResponse {
  success: boolean;
  message: string;
}

export interface DeleteCustomCoverRequest {
  albumId: string;
  customCoverId: string;
}

export interface DeleteCustomCoverResponse {
  success: boolean;
  message: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Upload a custom cover for an album
 */
async function uploadCustomCover(request: UploadCustomCoverRequest): Promise<UploadCustomCoverResponse> {
  const formData = new FormData();
  formData.append('file', request.file);

  const response = await apiClient.post<UploadCustomCoverResponse>(
    `/admin/metadata/album/custom-covers/${request.albumId}/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}

/**
 * List all custom covers for an album
 */
async function listCustomCovers(albumId: string): Promise<ListCustomCoversResponse> {
  const response = await apiClient.get<ListCustomCoversResponse>(
    `/admin/metadata/album/custom-covers/${albumId}`
  );
  return response.data;
}

/**
 * Apply a custom cover as the active cover
 */
async function applyCustomCover(request: ApplyCustomCoverRequest): Promise<ApplyCustomCoverResponse> {
  const response = await apiClient.post<ApplyCustomCoverResponse>(
    `/admin/metadata/album/custom-covers/${request.albumId}/apply/${request.customCoverId}`
  );
  return response.data;
}

/**
 * Delete a custom cover
 */
async function deleteCustomCover(request: DeleteCustomCoverRequest): Promise<DeleteCustomCoverResponse> {
  const response = await apiClient.delete<DeleteCustomCoverResponse>(
    `/admin/metadata/album/custom-covers/${request.albumId}/${request.customCoverId}`
  );
  return response.data;
}

// ============================================
// EXPORTS
// ============================================

export const albumCoversApi = {
  uploadCustomCover,
  listCustomCovers,
  applyCustomCover,
  deleteCustomCover,
};
