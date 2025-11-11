export interface TrackScore {
  trackId: string;
  totalScore: number; // 0-100
  breakdown: ScoreBreakdown;
  rank: number;
}

export interface ScoreBreakdown {
  explicitFeedback: number;  // 0-45 points from likes/ratings
  implicitBehavior: number;  // 0-35 points from play behavior
  recency: number;           // 0-15 points from temporal relevance
  diversity: number;         // 0-5 points from variety/exploration
}

export interface RecommendationOptions {
  userId: string;
  limit?: number;
  excludeListenedRecently?: boolean;
  diversityFactor?: number; // 0-1, how much to promote variety
  recencyDays?: number;     // Consider data from last N days
  minScore?: number;        // Minimum score threshold
}

export interface DailyMixConfig {
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

export interface DailyMix {
  id: string;
  userId: string;
  name: string;
  description: string;
  tracks: TrackScore[];
  createdAt: Date;
  expiresAt: Date;
  metadata: DailyMixMetadata;
}

export interface DailyMixMetadata {
  totalTracks: number;
  avgScore: number;
  topGenres: string[];
  topArtists: string[];
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
export const SCORING_WEIGHTS = {
  explicitFeedback: 0.45,  // 45% weight
  implicitBehavior: 0.35,  // 35% weight
  recency: 0.15,           // 15% weight
  diversity: 0.05,         // 5% weight
};

// Explicit feedback scoring
export const FEEDBACK_SCORES = {
  like: 40,
  dislike: -40,
  noFeedback: 0,
  ratingMultiplier: 12, // 1-5 stars → 12-60 points
};

// Recency decay factor (lambda for exponential decay)
export const RECENCY_DECAY = {
  lambda: 0.05,  // 5% decay per day
};
