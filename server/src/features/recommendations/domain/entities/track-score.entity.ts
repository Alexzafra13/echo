export interface TrackScore {
  trackId: string;
  totalScore: number; // 0-100
  breakdown: ScoreBreakdown;
  rank: number;
}

export interface ScoreBreakdown {
  explicitFeedback: number;  // 0-30 points from likes/ratings
  implicitBehavior: number;  // 0-50 points from play behavior (main factor)
  recency: number;           // 0-18 points from temporal relevance
  diversity: number;         // 0-2 points from variety/exploration
}

export interface RecommendationOptions {
  userId: string;
  limit?: number;
  excludeListenedRecently?: boolean;
  diversityFactor?: number; // 0-1, how much to promote variety
  recencyDays?: number;     // Consider data from last N days
  minScore?: number;        // Minimum score threshold
}

export interface WaveMixConfig {
  maxTracks: number;                // Max 50 tracks
  minScore: number;                 // Minimum score to consider (default: 20)
  freshnessRatio: number;           // 0-1, ratio of "new" tracks (default: 0.2)
  genreDiversity: number;           // 0-1, genre variety (default: 0.3)
  temporalBalance: TemporalBalance; // Distribution by time period
}

export interface TemporalBalance {
  lastWeek: number;    // 0.4 = 40% from last week
  lastMonth: number;   // 0.3 = 30% from last month
  lastYear: number;    // 0.2 = 20% from last year
  older: number;       // 0.1 = 10% from older
}

export interface AutoPlaylist {
  id: string;
  type: 'wave-mix' | 'artist' | 'genre' | 'mood';
  userId: string;
  name: string;
  description: string;
  tracks: TrackScore[];
  createdAt: Date;
  expiresAt: Date;
  metadata: PlaylistMetadata;
  coverColor?: string;  // Hex color for generated cover
  coverImageUrl?: string; // URL for artist/album cover
}

export interface PlaylistMetadata {
  totalTracks: number;
  avgScore: number;
  topGenres: string[];
  topArtists: string[];
  artistId?: string;  // For artist playlists
  artistName?: string; // For artist playlists
  temporalDistribution: {
    lastWeek: number;
    lastMonth: number;
    lastYear: number;
    older: number;
  };
}

export interface SmartPlaylistConfig {
  name: string;
  description?: string;
  artistId?: string;        // Build playlist for specific artist
  genreId?: string;         // Build playlist for specific genre
  mood?: string;            // Build playlist for mood (energetic, calm, etc.)
  minScore?: number;
  maxTracks?: number;
  sortBy?: 'score' | 'popularity' | 'recent' | 'random';
}

// Scoring algorithm weights
// Optimized to focus on what users actually listen to, not just likes
export const SCORING_WEIGHTS = {
  explicitFeedback: 0.30,  // 30% weight (reduced - many users don't like/rate)
  implicitBehavior: 0.50,  // 50% weight (increased - focus on what they actually play)
  recency: 0.18,           // 18% weight (slightly increased - recent activity matters)
  diversity: 0.02,         // 2% weight (reduced - don't force diversity too much)
};

// Explicit feedback scoring
export const FEEDBACK_SCORES = {
  like: 40,
  dislike: -40,
  noFeedback: 0,
  ratingMultiplier: 12, // 1-5 stars → 12-60 points
};

// Recency decay factor (lambda for exponential decay)
// Lower lambda = gentler decay = tracks stay relevant longer
export const RECENCY_DECAY = {
  lambda: 0.03,  // 3% decay per day (reduced from 5% for better retention)
};
