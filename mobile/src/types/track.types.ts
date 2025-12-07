/**
 * Shared Track Types
 * Centralized type definitions for tracks used across the application
 */

/**
 * Album cover information embedded in Track
 */
export interface TrackAlbum {
  id?: string;
  title?: string;
  artist?: string;
  cover?: string;
}

/**
 * Main Track interface used throughout the application
 * This is the primary track type that should be used everywhere
 */
export interface Track {
  id: string;
  title: string;

  // Artist information
  artistId?: string;
  artistName?: string;
  artist?: string; // Alias for artistName (for backward compatibility)

  // Album information
  albumId?: string;
  albumName?: string;
  albumTitle?: string; // Alias for albumName (some API responses use this)
  album?: TrackAlbum; // Nested album info (optional, for player UI)
  albumArtistId?: string;
  albumArtistName?: string;

  // Track metadata
  trackNumber?: number;
  discNumber?: number;
  year?: number;
  duration?: number; // in seconds

  // File information (optional for UI/player usage)
  path?: string;
  bitRate?: number;
  size?: number | string; // File size in bytes (number) or formatted string
  suffix?: string;

  // Additional metadata
  lyrics?: string;
  comment?: string;
  compilation?: boolean;

  // ReplayGain / Audio normalization
  rgTrackGain?: number; // Gain to normalize track (in dB)
  rgTrackPeak?: number; // Track peak (0-1)
  rgAlbumGain?: number; // Gain to normalize album (in dB)
  rgAlbumPeak?: number; // Album peak (0-1)

  // Player/playlist context
  coverImage?: string; // Direct cover URL (for player UI)
  playlistOrder?: number; // Order in playlist (when track is from a playlist)

  // Timestamps
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

