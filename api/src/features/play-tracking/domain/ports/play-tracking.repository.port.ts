import {
  PlayEvent,
  PlayStats,
  PlayContext,
  SourceType,
  UserPlaySummary,
  TrackPlaySummary,
} from '../entities/play-event.entity';

export interface IPlayTrackingRepository {
  // Record play events
  recordPlay(event: Omit<PlayEvent, 'id' | 'createdAt'>): Promise<PlayEvent>;
  recordSkip(userId: string, trackId: string, completionRate: number, playContext: PlayContext): Promise<PlayEvent>;

  // Update play stats (aggregated)
  updatePlayStats(userId: string, trackId: string, playContext: PlayContext, completionRate: number): Promise<void>;

  // Get play history
  getUserPlayHistory(userId: string, limit?: number, offset?: number): Promise<PlayEvent[]>;
  getTrackPlayHistory(trackId: string, limit?: number): Promise<PlayEvent[]>;

  // Get play stats
  getUserPlayStats(userId: string, itemType?: string): Promise<PlayStats[]>;
  getTrackPlayStats(trackId: string): Promise<PlayStats[]>;

  // Get summaries
  getUserPlaySummary(userId: string, days?: number): Promise<UserPlaySummary>;
  getTrackPlaySummary(trackId: string): Promise<TrackPlaySummary>;

  // Get top played items
  getUserTopTracks(userId: string, limit?: number, days?: number): Promise<{ trackId: string; playCount: number; weightedPlayCount: number }[]>;
  getUserTopAlbums(userId: string, limit?: number, days?: number): Promise<{ albumId: string; playCount: number }[]>;
  getUserTopArtists(userId: string, limit?: number, days?: number): Promise<{ artistId: string; playCount: number }[]>;

  // Get play count for a specific item
  getItemPlayCount(userId: string, itemId: string, itemType: 'track' | 'album' | 'artist'): Promise<{ playCount: number; lastPlayedAt: Date | null } | null>;

  // Get global play count for a specific item (sum across all users)
  getItemGlobalPlayCount(itemId: string, itemType: 'track' | 'album' | 'artist'): Promise<number>;

  // Get recently played
  getRecentlyPlayed(userId: string, limit?: number): Promise<string[]>; // Returns track IDs

  // Analytics
  getListeningTimeByDay(userId: string, days?: number): Promise<{ date: string; minutes: number }[]>;

  // Playback state (for social "listening now" feature)
  updatePlaybackState(userId: string, isPlaying: boolean, currentTrackId: string | null): Promise<void>;
}
