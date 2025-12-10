/**
 * Last.fm API Response Types
 *
 * Based on: https://www.last.fm/api
 * These types represent the raw JSON responses from the Last.fm API.
 */

// ============ Common Types ============

export interface LastFMImage {
  '#text': string;
  size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega' | '';
}

export interface LastFMTag {
  name: string;
  url?: string;
  count?: string; // Last.fm returns count as string
}

export interface LastFMTags {
  tag: LastFMTag | LastFMTag[];
}

// ============ Artist Types ============

export interface LastFMArtistBio {
  links?: {
    link?: {
      '#text': string;
      rel: string;
      href: string;
    };
  };
  published?: string;
  summary?: string;
  content?: string;
}

export interface LastFMArtistStats {
  listeners?: string;
  playcount?: string;
}

export interface LastFMArtistResponse {
  name: string;
  mbid?: string;
  url?: string;
  image?: LastFMImage[];
  streamable?: string;
  ontour?: string;
  stats?: LastFMArtistStats;
  similar?: {
    artist?: Array<{
      name: string;
      url?: string;
      image?: LastFMImage[];
    }>;
  };
  tags?: LastFMTags;
  bio?: LastFMArtistBio;
}

export interface LastFMArtistInfoResponse {
  artist?: LastFMArtistResponse;
  error?: number;
  message?: string;
}

// ============ Similar Artists Types (artist.getSimilar) ============

export interface LastFMSimilarArtist {
  name: string;
  mbid?: string;
  match?: string; // 0-1 as string
  url?: string;
  image?: LastFMImage[];
  streamable?: string;
}

export interface LastFMSimilarArtistsResponse {
  similarartists?: {
    artist?: LastFMSimilarArtist[];
    '@attr'?: {
      artist: string;
    };
  };
  error?: number;
  message?: string;
}

// ============ Album Types ============

export interface LastFMAlbumTrack {
  name: string;
  url?: string;
  duration?: string;
  '@attr'?: {
    rank: string;
  };
  artist?: {
    name: string;
    url?: string;
  };
}

export interface LastFMAlbumResponse {
  name: string;
  artist?: string;
  mbid?: string;
  url?: string;
  image?: LastFMImage[];
  listeners?: string;
  playcount?: string;
  tracks?: {
    track?: LastFMAlbumTrack | LastFMAlbumTrack[];
  };
  tags?: LastFMTags;
  wiki?: {
    published?: string;
    summary?: string;
    content?: string;
  };
}

export interface LastFMAlbumInfoResponse {
  album?: LastFMAlbumResponse;
  error?: number;
  message?: string;
}
