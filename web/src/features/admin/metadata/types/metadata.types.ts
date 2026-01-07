/**
 * Metadata Settings Types
 *
 * Core types for metadata configuration system
 */

// ============================================================================
// Settings
// ============================================================================

export interface MetadataSettings {
  autoEnrichEnabled: boolean;
  providers: ProvidersConfig;
  storage: StorageConfig;
  autoSearch: AutoSearchConfig;
}

export interface ProvidersConfig {
  coverartarchive: ProviderConfig;
  lastfm: ProviderConfig;
  fanart: ProviderConfig;
}

export interface ProviderConfig {
  enabled: boolean;
  apiKey: string | null;
}

export interface StorageConfig {
  mode: 'centralized' | 'portable';
  path: string;
}

export interface AutoSearchConfig {
  enabled: boolean;
  confidenceThreshold: number;
  autoApply: boolean;
}

// ============================================================================
// API DTOs
// ============================================================================

export interface SettingDTO {
  key: string;
  value: string;
  description?: string;
}

export interface ProviderValidationResult {
  valid: boolean;
  message: string;
  service?: string;
}

export interface StorageValidationResult {
  valid: boolean;
  writable: boolean;
  exists: boolean;
  readOnly: boolean;
  spaceAvailable: string;
  message: string;
}

export interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  writable?: boolean;
}

export interface DirectoryBrowseResult {
  currentPath: string;
  parentPath: string | null;
  directories: DirectoryItem[];
}

// ============================================================================
// Maintenance & Stats
// ============================================================================

export interface StorageStats {
  totalSize: number;
  fileCount: number;
  orphanedCount: number;
  cacheSize: number;
  lastCleanup: string | null;
}

export interface CleanupResult {
  filesRemoved: number;
  spaceFreed: number;
  duration: number;
}

// ============================================================================
// Auto Search
// ============================================================================

export interface AutoSearchStats {
  totalAutoSearched: number;
  autoApplied: number;
  conflictsCreated: number;
  ignored: number;
}

// ============================================================================
// Enums and Constants
// ============================================================================

export type StorageMode = 'centralized' | 'portable';

export const PROVIDER_LABELS: Record<string, string> = {
  musicbrainz: 'MusicBrainz',
  coverartarchive: 'Cover Art Archive',
  lastfm: 'Last.fm',
  fanart: 'Fanart.tv',
} as const;

export const STORAGE_MODE_LABELS: Record<StorageMode, string> = {
  centralized: 'Centralizado',
  portable: 'Portátil',
} as const;
