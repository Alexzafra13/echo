export interface GetDjShuffledTracksInput {
  /** Seed for deterministic shuffling (0-1). If not provided, a new one is generated */
  seed?: number;
  /** Number of tracks to skip (for pagination) */
  skip?: number;
  /** Number of tracks to return (max 100) */
  take?: number;
}

export interface DjShuffledTrack {
  id: string;
  title: string;
  albumId: string | null;
  artistId: string | null;
  albumArtistId: string | null;
  trackNumber: number | null;
  discNumber: number | null;
  year: number | null;
  duration: number | null;
  path: string;
  bitRate: number | null;
  size: number | null;
  suffix: string | null;
  albumName: string | null;
  artistName: string | null;
  albumArtistName: string | null;
  compilation: boolean;
  rgTrackGain: number | null;
  rgTrackPeak: number | null;
  rgAlbumGain: number | null;
  rgAlbumPeak: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetDjShuffledTracksOutput {
  data: DjShuffledTrack[];
  total: number;
  seed: number;
  skip: number;
  take: number;
  hasMore: boolean;
  /** Whether DJ-aware ordering was used (true) or fallback to random (false) */
  djMode: boolean;
}
