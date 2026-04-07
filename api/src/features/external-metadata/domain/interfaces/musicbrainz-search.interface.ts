import { IAgent } from './agent.interface';

/**
 * MusicBrainz tag (genre/style/descriptor)
 */
export interface MusicBrainzTag {
  name: string;
  count: number; // Vote count - higher = more agreed upon
}

/**
 * MusicBrainz search result for artist
 */
export interface MusicBrainzArtistMatch {
  mbid: string;
  name: string;
  sortName?: string;
  disambiguation?: string;
  type?: string; // Person, Group, Orchestra, etc.
  country?: string;
  lifeSpan?: {
    begin?: string;
    end?: string;
  };
  tags?: MusicBrainzTag[]; // Genre tags from MusicBrainz
  score: number; // Match confidence (0-100)
}

/**
 * MusicBrainz search result for album (release-group)
 */
export interface MusicBrainzAlbumMatch {
  mbid: string;
  title: string;
  artistName: string;
  artistMbid?: string;
  primaryType?: string; // Album, Single, EP, etc.
  secondaryTypes?: string[];
  firstReleaseDate?: string;
  disambiguation?: string;
  tags?: MusicBrainzTag[]; // Genre tags from MusicBrainz
  score: number; // Match confidence (0-100)
}

/**
 * MusicBrainz search result for recording (track/song)
 */
export interface MusicBrainzRecordingMatch {
  mbid: string; // Recording MBID
  title: string;
  artistName: string;
  artistMbid?: string;
  length?: number; // Duration in milliseconds
  releases?: Array<{
    mbid: string; // Release MBID
    title: string;
    trackNumber?: number;
    trackCount?: number;
  }>;
  score: number; // Match confidence (0-100)
}

/**
 * Interface for agents that can search MusicBrainz database
 */
export interface IMusicBrainzSearch extends IAgent {
  /**
   * Search for artists by name
   * @param artistName Artist name to search for
   * @param limit Maximum number of results (default: 5)
   * @returns Array of artist matches sorted by score
   */
  searchArtist(
    artistName: string,
    limit?: number
  ): Promise<MusicBrainzArtistMatch[]>;

  /**
   * Search for albums (release-groups) by title and artist
   * @param albumTitle Album title to search for
   * @param artistName Artist name for better matching
   * @param limit Maximum number of results (default: 5)
   * @returns Array of album matches sorted by score
   */
  searchAlbum(
    albumTitle: string,
    artistName?: string,
    limit?: number
  ): Promise<MusicBrainzAlbumMatch[]>;

  /**
   * Get detailed artist information by MBID
   * @param mbid MusicBrainz Artist ID
   * @returns Artist details or null if not found
   */
  getArtistByMbid(mbid: string): Promise<MusicBrainzArtistMatch | null>;

  /**
   * Get detailed album information by MBID
   * @param mbid MusicBrainz Release-Group ID
   * @returns Album details or null if not found
   */
  getAlbumByMbid(mbid: string): Promise<MusicBrainzAlbumMatch | null>;

  /**
   * Search for recordings (tracks) by metadata
   * Uses multi-field search (artist + release + recording + track#) for high accuracy
   * @param params Search parameters
   * @param limit Maximum number of results (default: 5)
   * @returns Array of recording matches sorted by score
   */
  searchRecording(
    params: {
      artist: string;
      release?: string;
      recording: string;
      trackNumber?: number;
      duration?: number; // Duration in seconds (±10s tolerance)
      isrc?: string; // International Standard Recording Code
    },
    limit?: number
  ): Promise<MusicBrainzRecordingMatch[]>;
}
