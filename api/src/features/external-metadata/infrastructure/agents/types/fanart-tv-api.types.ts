/**
 * Fanart.tv API Response Types
 *
 * Based on: https://fanart.tv/api-docs/
 * These types represent the raw JSON responses from the Fanart.tv API.
 */

// ============ Common Types ============

export interface FanartImage {
  id: string;
  url: string;
  likes: string; // Fanart.tv returns likes as string
  disc?: string;
  size?: string;
}

// ============ Artist Types ============

export interface FanartArtistResponse {
  name: string;
  mbid_id: string;
  artistthumb?: FanartImage[];
  artistbackground?: FanartImage[];
  musiclogo?: FanartImage[];
  hdmusiclogo?: FanartImage[];
  musicbanner?: FanartImage[];
  albums?: Record<string, FanartAlbumData>;
}

// ============ Album Types ============

export interface FanartAlbumData {
  albumcover?: FanartImage[];
  cdart?: FanartImage[];
}

// ============ Helper type for image selection ============

export type FanartImageArray = FanartImage[] | undefined;
