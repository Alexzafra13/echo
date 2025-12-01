/**
 * Metadata API Layer
 *
 * Type-safe API client for metadata settings endpoints.
 * All API calls go through this layer for consistency.
 */

import { apiClient } from '@shared/services/api';
import { metadataService } from '../services/metadataService';
import type {
  MetadataSettings,
  SettingDTO,
  ProviderValidationResult,
  StorageValidationResult,
  DirectoryBrowseResult,
  StorageStats,
  CleanupResult,
  AutoSearchStats,
  AutoSearchConfig,
} from '../types';

/**
 * Get all metadata settings
 *
 * Fetches raw settings from backend and parses them into typed object
 *
 * @returns Parsed metadata settings
 */
export async function getSettings(): Promise<MetadataSettings> {
  const response = await apiClient.get<SettingDTO[]>('/admin/settings');
  return metadataService.parseSettings(response.data);
}

/**
 * Update a specific setting
 *
 * @param key - Setting key (e.g., 'metadata.lastfm.api_key')
 * @param value - Setting value
 */
export async function updateSetting(key: string, value: string): Promise<void> {
  await apiClient.put(`/admin/settings/${key}`, { value });
}

/**
 * Validate API key
 *
 * @param service - Service name ('lastfm' or 'fanart')
 * @param apiKey - API key to validate
 * @returns Validation result
 */
export async function validateApiKey(
  service: 'lastfm' | 'fanart',
  apiKey: string
): Promise<ProviderValidationResult> {
  const response = await apiClient.post<ProviderValidationResult>(
    '/admin/settings/validate-api-key',
    { service, apiKey }
  );
  return response.data;
}

/**
 * Validate storage path
 *
 * @param path - Storage path to validate
 * @returns Validation result with writability check
 */
export async function validateStoragePath(path: string): Promise<StorageValidationResult> {
  const response = await apiClient.post<StorageValidationResult>(
    '/admin/settings/validate-storage-path',
    { path }
  );
  return response.data;
}

/**
 * Browse directories for storage path selection
 *
 * @param path - Directory path to browse (optional, defaults to root or parent)
 * @returns Directory listing
 */
export async function browseDirectories(path?: string): Promise<DirectoryBrowseResult> {
  const response = await apiClient.post<DirectoryBrowseResult>(
    '/admin/settings/browse-directories',
    { path: path || '/' }
  );
  return response.data;
}

// ============================================================================
// Maintenance API
// ============================================================================

/**
 * Get storage statistics
 *
 * @returns Current storage stats (size, file count, etc.)
 */
export async function getStorageStats(): Promise<StorageStats> {
  const response = await apiClient.get<StorageStats>('/maintenance/storage/stats');
  return response.data;
}

/**
 * Clean up orphaned metadata files
 *
 * @returns Cleanup result (files removed, space freed)
 */
export async function cleanupOrphanedFiles(): Promise<CleanupResult> {
  const response = await apiClient.post<CleanupResult>('/maintenance/cleanup/orphaned');
  return response.data;
}

/**
 * Clear metadata cache
 *
 * @returns Success status
 */
export async function clearCache(): Promise<void> {
  await apiClient.post('/admin/settings/cache/clear');
}

// ============================================================================
// Auto Search API
// ============================================================================

/**
 * Get auto-search configuration
 *
 * @returns Current auto-search config
 */
export async function getAutoSearchConfig(): Promise<AutoSearchConfig> {
  const response = await apiClient.get<AutoSearchConfig>('/admin/mbid-auto-search/config');
  return response.data;
}

/**
 * Update auto-search configuration
 *
 * @param config - New configuration
 */
export async function updateAutoSearchConfig(config: Partial<AutoSearchConfig>): Promise<void> {
  await apiClient.put('/admin/mbid-auto-search/config', config);
}

/**
 * Get auto-search statistics
 *
 * @returns Auto-search performance stats
 */
export async function getAutoSearchStats(): Promise<AutoSearchStats> {
  const response = await apiClient.get<AutoSearchStats>('/admin/mbid-auto-search/stats');
  return response.data;
}
