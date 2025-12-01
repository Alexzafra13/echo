/**
 * Metadata Service
 *
 * Business logic layer for metadata operations.
 * Keeps UI components clean by handling parsing, validation, and transformations.
 */

import type {
  MetadataSettings,
  SettingDTO,
} from '../types/metadata.types';

export const metadataService = {
  /**
   * Parse raw settings array from API into typed settings object
   *
   * @param rawSettings - Array of setting DTOs from backend
   * @returns Typed metadata settings object
   */
  parseSettings(rawSettings: SettingDTO[]): MetadataSettings {
    const settingsMap = new Map(
      rawSettings.map(s => [s.key, s.value])
    );

    const getBoolean = (key: string, defaultValue = false): boolean => {
      const value = settingsMap.get(key);
      return value === 'true' ? true : value === 'false' ? false : defaultValue;
    };

    const getString = (key: string, defaultValue = ''): string => {
      return settingsMap.get(key) || defaultValue;
    };

    const getNumber = (key: string, defaultValue = 0): number => {
      const value = settingsMap.get(key);
      return value ? parseFloat(value) : defaultValue;
    };

    return {
      autoEnrichEnabled: getBoolean('metadata.auto_enrich.enabled'),
      providers: {
        coverartarchive: {
          enabled: true, // Always enabled
          apiKey: null,
        },
        lastfm: {
          enabled: !!getString('metadata.lastfm.api_key'),
          apiKey: getString('metadata.lastfm.api_key'),
        },
        fanart: {
          enabled: !!getString('metadata.fanart.api_key'),
          apiKey: getString('metadata.fanart.api_key'),
        },
      },
      storage: {
        mode: (getString('metadata.storage.location', 'centralized') as 'centralized' | 'portable'),
        path: getString('metadata.storage.path', '/app/uploads/metadata'),
      },
      autoSearch: {
        enabled: getBoolean('metadata.mbid_auto_search.enabled'),
        confidenceThreshold: getNumber('metadata.mbid_auto_search.confidence_threshold', 0.85),
        autoApply: getBoolean('metadata.mbid_auto_search.auto_apply'),
      },
    };
  },

  /**
   * Validate API key format (client-side)
   *
   * @param service - Service name
   * @param key - API key to validate
   * @returns Validation result
   */
  validateApiKeyFormat(service: string, key: string): { valid: boolean; message: string } {
    if (!key.trim()) {
      return { valid: false, message: 'API key requerida' };
    }

    if (key.length < 10) {
      return { valid: false, message: 'API key demasiado corta (mínimo 10 caracteres)' };
    }

    // Service-specific validations
    if (service === 'lastfm' && key.length !== 32) {
      return { valid: false, message: 'Last.fm API keys tienen 32 caracteres' };
    }

    return { valid: true, message: '' };
  },

  /**
   * Validate storage path format
   *
   * @param path - Path to validate
   * @returns Validation result
   */
  validateStoragePathFormat(path: string): { valid: boolean; message: string } {
    if (!path.trim()) {
      return { valid: false, message: 'Ruta requerida' };
    }

    if (path.includes('..')) {
      return { valid: false, message: 'Ruta no puede contener ".."' };
    }

    if (!path.startsWith('/')) {
      return { valid: false, message: 'Ruta debe ser absoluta (empezar con /)' };
    }

    return { valid: true, message: '' };
  },

  /**
   * Get display label for provider
   *
   * @param provider - Provider key
   * @returns Human-readable label
   */
  getProviderLabel(provider: string): string {
    const labels: Record<string, string> = {
      musicbrainz: 'MusicBrainz',
      coverartarchive: 'Cover Art Archive',
      lastfm: 'Last.fm',
      fanart: 'Fanart.tv',
    };
    return labels[provider] || provider;
  },

  /**
   * Get confidence threshold description
   *
   * @param threshold - Threshold value (0-1)
   * @returns Description string
   */
  getConfidenceDescription(threshold: number): string {
    if (threshold >= 0.95) return 'Muy Alto (solo coincidencias casi perfectas)';
    if (threshold >= 0.85) return 'Alto (coincidencias confiables)';
    if (threshold >= 0.75) return 'Medio (incluye coincidencias probables)';
    if (threshold >= 0.60) return 'Bajo (incluye coincidencias posibles)';
    return 'Muy Bajo (muchas coincidencias inciertas)';
  },

  /**
   * Get confidence color for UI
   *
   * @param confidence - Confidence value (0-1)
   * @returns CSS color value
   */
  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) return '#10b981'; // green
    if (confidence >= 0.75) return '#3b82f6'; // blue
    if (confidence >= 0.6) return '#f59e0b'; // amber
    return '#ef4444'; // red
  },
};
