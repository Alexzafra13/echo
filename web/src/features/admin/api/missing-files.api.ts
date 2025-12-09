import { apiClient } from '@shared/services';

export interface MissingTrack {
  id: string;
  title: string;
  path: string;
  albumName: string | null;
  artistName: string | null;
  missingAt: string | null;
}

export interface MissingFilesResponse {
  tracks: MissingTrack[];
  count: number;
  purgeMode: string;
}

export interface PurgeResult {
  success: boolean;
  deleted: number;
  message: string;
}

export interface DeleteTrackResult {
  success: boolean;
  message: string;
  albumDeleted?: boolean;
  artistDeleted?: boolean;
}

export interface PurgeModeResponse {
  mode: string;
}

/**
 * Get list of missing files
 */
export async function getMissingFiles(): Promise<MissingFilesResponse> {
  const { data } = await apiClient.get<MissingFilesResponse>('/scanner/missing-files');
  return data;
}

/**
 * Purge all missing files based on current purge mode
 */
export async function purgeMissingFiles(): Promise<PurgeResult> {
  const { data } = await apiClient.post<PurgeResult>('/scanner/missing-files/purge');
  return data;
}

/**
 * Delete a specific missing track
 */
export async function deleteMissingTrack(trackId: string): Promise<DeleteTrackResult> {
  const { data } = await apiClient.delete<DeleteTrackResult>(`/scanner/missing-files/${trackId}`);
  return data;
}

/**
 * Get current purge mode
 */
export async function getPurgeMode(): Promise<PurgeModeResponse> {
  const { data } = await apiClient.get<PurgeModeResponse>('/scanner/missing-files/purge-mode');
  return data;
}

/**
 * Update purge mode setting
 */
export async function updatePurgeMode(mode: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.put<{ success: boolean }>('/admin/settings/library.purgeMissing', {
    value: mode,
  });
  return data;
}
