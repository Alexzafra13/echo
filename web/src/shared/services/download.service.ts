import { apiClient } from './api';

/**
 * Get a fresh stream token for downloads
 */
async function getStreamToken(): Promise<string> {
  const response = await apiClient.get<{ token: string }>('/stream-token');
  return response.data.token;
}

/**
 * Download a single track
 * @param trackId - UUID of the track to download
 * @param fileName - Optional custom filename
 */
export async function downloadTrack(trackId: string, fileName?: string): Promise<void> {
  const token = await getStreamToken();
  const url = `/api/tracks/${trackId}/download?token=${token}`;

  // Create a temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || '';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download an album as ZIP
 * @param albumId - UUID of the album to download
 * @param albumName - Album name for the filename
 * @param artistName - Artist name for the filename
 */
export async function downloadAlbum(
  albumId: string,
  albumName: string,
  artistName: string,
): Promise<void> {
  const token = await getStreamToken();
  const url = `/api/albums/${albumId}/download?token=${token}`;

  // Create a temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = `${artistName} - ${albumName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const downloadService = {
  downloadTrack,
  downloadAlbum,
};
