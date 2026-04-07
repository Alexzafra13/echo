export type PlayContext =
  | 'direct'         // User searched and played directly
  | 'album'          // Playing from album view
  | 'playlist'       // Playing from playlist
  | 'artist'         // Playing from artist view
  | 'shuffle'        // Random/shuffle playback
  | 'radio'          // Radio station
  | 'recommendation' // From recommendation system
  | 'search'         // From search results
  | 'queue';         // From play queue

export type SourceType = 'album' | 'playlist' | 'artist' | 'radio' | 'search' | 'recommendation';

export interface PlayEvent {
  id: string;
  userId: string;
  trackId: string;
  playedAt: Date;
  client?: string;
  playContext: PlayContext;
  completionRate?: number; // 0.0 - 1.0
  skipped: boolean;
  sourceId?: string;
  sourceType?: SourceType;
  createdAt: Date;
}

export interface PlayStats {
  userId: string;
  itemId: string;
  itemType: 'track' | 'album' | 'artist';
  playCount: number;
  weightedPlayCount: number; // Play count weighted by context
  lastPlayedAt?: Date;
  avgCompletionRate?: number;
  skipCount: number;
}

export interface UserPlaySummary {
  totalPlays: number;
  totalSkips: number;
  avgCompletionRate: number;
  topContext: PlayContext;
  playsByContext: Record<PlayContext, number>;
  recentPlays: PlayEvent[];
}

export interface TrackPlaySummary {
  trackId: string;
  totalPlays: number;
  uniqueListeners: number;
  avgCompletionRate: number;
  skipRate: number;
  popularityScore: number; // Calculated score based on plays and completion
}

// Context weights for scoring algorithm
export const CONTEXT_WEIGHTS: Record<PlayContext, number> = {
  direct: 1.0,          // Highest weight - intentional play
  search: 0.9,          // Very high - user searched for it
  artist: 0.75,         // High - exploring artist
  playlist: 0.8,        // High - curated listening
  album: 0.6,           // Medium-high - album context
  queue: 0.7,           // Medium-high - added to queue
  recommendation: 0.7,  // Medium-high - from our recommendations
  radio: 0.4,           // Medium - passive listening
  shuffle: 0.2,         // Low - random playback
};
