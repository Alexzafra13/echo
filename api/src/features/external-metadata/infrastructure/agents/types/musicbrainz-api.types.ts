/**
 * MusicBrainz API Response Types
 *
 * Based on: https://musicbrainz.org/doc/MusicBrainz_API
 * These types represent the raw JSON responses from the MusicBrainz API.
 */

// ============ Common Types ============

export interface MBLifeSpan {
  begin?: string;
  end?: string;
  ended?: boolean;
}

export interface MBTag {
  name: string;
  count: number;
}

export interface MBArtistCredit {
  name: string;
  artist: {
    id: string;
    name: string;
    'sort-name'?: string;
  };
  joinphrase?: string;
}

// ============ Artist Types ============

export interface MBArtistResponse {
  id: string;
  name: string;
  'sort-name'?: string;
  disambiguation?: string;
  type?: string;
  country?: string;
  'life-span'?: MBLifeSpan;
  tags?: MBTag[];
  score?: number;
}

export interface MBArtistSearchResponse {
  created: string;
  count: number;
  offset: number;
  artists: MBArtistResponse[];
}

// ============ Release Group (Album) Types ============

export interface MBReleaseGroupResponse {
  id: string;
  title: string;
  'primary-type'?: string;
  'secondary-types'?: string[];
  'first-release-date'?: string;
  disambiguation?: string;
  'artist-credit'?: MBArtistCredit[];
  tags?: MBTag[];
  score?: number;
}

export interface MBReleaseGroupSearchResponse {
  created: string;
  count: number;
  offset: number;
  'release-groups': MBReleaseGroupResponse[];
}

// ============ Recording (Track) Types ============

export interface MBReleaseMedia {
  track?: Array<{
    number: string;
  }>;
  'track-count'?: number;
}

export interface MBRecordingRelease {
  id: string;
  title: string;
  media?: MBReleaseMedia[];
}

export interface MBRecordingResponse {
  id: string;
  title: string;
  length?: number;
  'artist-credit'?: MBArtistCredit[];
  releases?: MBRecordingRelease[];
  score?: number;
}

export interface MBRecordingSearchResponse {
  created: string;
  count: number;
  offset: number;
  recordings: MBRecordingResponse[];
}
