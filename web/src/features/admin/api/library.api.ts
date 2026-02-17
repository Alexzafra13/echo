import { apiClient } from '@shared/services';

export interface LibraryConfig {
  path: string;
  exists: boolean;
  readable: boolean;
  fileCount: number;
  mountedPaths: string[];
}

export interface DirectoryInfo {
  name: string;
  path: string;
  readable: boolean;
  hasMusic: boolean;
}

export interface BrowseResult {
  currentPath: string;
  parentPath: string | null;
  canGoUp: boolean;
  directories: DirectoryInfo[];
  error?: string;
}

export interface UpdateLibraryResult {
  success: boolean;
  message: string;
  path?: string;
  fileCount?: number;
}

export async function getLibraryConfig(): Promise<LibraryConfig> {
  const { data } = await apiClient.get<LibraryConfig>('/admin/library');
  return data;
}

export async function updateLibraryPath(path: string): Promise<UpdateLibraryResult> {
  const { data } = await apiClient.put<UpdateLibraryResult>('/admin/library', { path });
  return data;
}

export async function browseDirectories(path: string): Promise<BrowseResult> {
  const { data } = await apiClient.post<BrowseResult>('/admin/library/browse', { path });
  return data;
}
