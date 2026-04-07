/**
 * Home section identifiers
 * These represent the different sections that can appear on a user's home page
 */
export type HomeSectionId =
  | 'recent-albums'
  | 'artist-mix'
  | 'genre-mix'
  | 'recently-played'
  | 'my-playlists'
  | 'top-played'
  | 'favorite-radios'
  | 'surprise-me'
  | 'shared-albums';

/**
 * Configuration for a single home page section
 */
export interface HomeSectionConfig {
  /** Unique identifier for the section */
  id: HomeSectionId;
  /** Whether the section is visible */
  enabled: boolean;
  /** Display order (0 = first) */
  order: number;
}

/**
 * Default home sections configuration
 */
export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = [
  { id: 'recent-albums', enabled: true, order: 0 },
  { id: 'artist-mix', enabled: true, order: 1 },
  { id: 'genre-mix', enabled: false, order: 2 },
  { id: 'recently-played', enabled: false, order: 3 },
  { id: 'my-playlists', enabled: false, order: 4 },
  { id: 'top-played', enabled: false, order: 5 },
  { id: 'favorite-radios', enabled: false, order: 6 },
  { id: 'surprise-me', enabled: false, order: 7 },
  { id: 'shared-albums', enabled: false, order: 8 },
];

/**
 * Valid section IDs for validation
 */
export const VALID_HOME_SECTION_IDS: HomeSectionId[] = [
  'recent-albums',
  'artist-mix',
  'genre-mix',
  'recently-played',
  'my-playlists',
  'top-played',
  'favorite-radios',
  'surprise-me',
  'shared-albums',
];
