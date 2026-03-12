/**
 * Provider Branding Configuration
 *
 * Centralizes logo paths, brand colors, and metadata for each
 * external metadata provider. Used across Providers, AutoSearch,
 * and History tabs for consistent visual identity.
 */

export interface ProviderBranding {
  id: string;
  name: string;
  description: string;
  logoPath: string;
  brandColor: string;
  brandColorRgb: string;
  websiteUrl: string;
  requiresApiKey: boolean;
  apiKeyUrl?: string;
  /** Logo height in px for small contexts (stats grid, table rows) */
  statsLogoHeight?: number;
}

export const PROVIDER_BRANDING: Record<string, ProviderBranding> = {
  musicbrainz: {
    id: 'musicbrainz',
    name: 'MusicBrainz',
    description: 'Enciclopedia musical abierta - IDs y metadata base',
    logoPath: '/images/providers/musicbrainz.svg',
    brandColor: '#EB743B',
    brandColorRgb: '235, 116, 59',
    websiteUrl: 'https://musicbrainz.org',
    requiresApiKey: false,
    statsLogoHeight: 26,
  },
  coverartarchive: {
    id: 'coverartarchive',
    name: 'Cover Art Archive',
    description: 'Portadas de albumes de alta calidad',
    logoPath: '/images/providers/coverartarchive.svg',
    brandColor: '#428BCA',
    brandColorRgb: '66, 139, 202',
    websiteUrl: 'https://coverartarchive.org',
    requiresApiKey: false,
    statsLogoHeight: 34,
  },
  lastfm: {
    id: 'lastfm',
    name: 'Last.fm',
    description: 'Biografias de artistas y albumes',
    logoPath: '/images/providers/lastfm.svg',
    brandColor: '#D51007',
    brandColorRgb: '213, 16, 7',
    websiteUrl: 'https://www.last.fm',
    requiresApiKey: true,
    apiKeyUrl: 'https://www.last.fm/api/account/create',
    statsLogoHeight: 20,
  },
  fanart: {
    id: 'fanart',
    name: 'Fanart.tv',
    description: 'Imagenes de artistas y portadas de albumes',
    logoPath: '/images/providers/fanart.svg',
    brandColor: '#1C94E0',
    brandColorRgb: '28, 148, 224',
    websiteUrl: 'https://fanart.tv',
    requiresApiKey: true,
    apiKeyUrl: 'https://fanart.tv/get-an-api-key/',
    statsLogoHeight: 26,
  },
  wikipedia: {
    id: 'wikipedia',
    name: 'Wikipedia',
    description: 'Biografías y descripciones de artistas',
    logoPath: '/images/providers/wikipedia.svg',
    brandColor: '#636466',
    brandColorRgb: '99, 100, 102',
    websiteUrl: 'https://wikipedia.org',
    requiresApiKey: false,
    statsLogoHeight: 40,
  },
  'apple-touch-icon': {
    id: 'apple-touch-icon',
    name: 'Apple Touch Icon',
    description: 'Favicons de alta calidad desde sitios web de emisoras',
    logoPath: '/images/providers/apple.svg',
    brandColor: '#A2AAAD',
    brandColorRgb: '162, 170, 173',
    websiteUrl: 'https://developer.apple.com',
    requiresApiKey: false,
    statsLogoHeight: 32,
  },
  'google-favicon': {
    id: 'google-favicon',
    name: 'Google Favicon',
    description: 'Favicons indexados por Google desde URLs de emisoras',
    logoPath: '/images/providers/google-icon-logo.svg',
    brandColor: '#4285F4',
    brandColorRgb: '66, 133, 244',
    websiteUrl: 'https://www.google.com',
    requiresApiKey: false,
    statsLogoHeight: 32,
  },
};

/** Get branding by provider key, with fallback */
export function getProviderBranding(key: string): ProviderBranding | undefined {
  return PROVIDER_BRANDING[key.toLowerCase()];
}
