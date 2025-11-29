/**
 * Setup API
 * Handles first-run setup wizard communication with backend
 */

import axios from 'axios';

const API_BASE = '/api/setup';

export interface MountedLibraryInfo {
  path: string;
  isMounted: boolean;
  hasContent: boolean;
  fileCount: number;
}

export interface SetupStatus {
  needsSetup: boolean;
  hasAdmin: boolean;
  hasMusicLibrary: boolean;
  musicLibraryPath: string | null;
  setupCompleted: boolean;
  mountedLibrary: MountedLibraryInfo;
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
  directories: DirectoryInfo[];
  canGoUp: boolean;
}

export interface LibraryValidationResult {
  valid: boolean;
  message: string;
  fileCount?: number;
}

/**
 * Get current setup status
 */
export async function getSetupStatus(): Promise<SetupStatus> {
  const response = await axios.get<SetupStatus>(`${API_BASE}/status`);
  return response.data;
}

/**
 * Create admin account
 */
export async function createAdmin(data: {
  username: string;
  password: string;
}): Promise<{ success: boolean; message: string; username: string }> {
  const response = await axios.post(`${API_BASE}/admin`, data);
  return response.data;
}

/**
 * Configure music library path
 */
export async function configureLibrary(path: string): Promise<LibraryValidationResult> {
  const response = await axios.post<LibraryValidationResult>(`${API_BASE}/library`, { path });
  return response.data;
}

/**
 * Browse directories
 */
export async function browseDirectories(path: string): Promise<BrowseResult> {
  const response = await axios.post<BrowseResult>(`${API_BASE}/browse`, { path });
  return response.data;
}

/**
 * Complete setup
 */
export async function completeSetup(): Promise<{ success: boolean; message: string }> {
  const response = await axios.post(`${API_BASE}/complete`);
  return response.data;
}
