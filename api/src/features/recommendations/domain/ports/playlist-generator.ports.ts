import { AutoPlaylist, SmartPlaylistConfig, TrackScore, WaveMixConfig } from '../entities/track-score.entity';

/** Metadata returned from smart playlist generation */
export interface SmartPlaylistMetadata {
  totalTracks: number;
  avgScore: number;
  config?: Partial<SmartPlaylistConfig>;
}

/** Result of smart playlist generation */
export interface SmartPlaylistResult {
  tracks: TrackScore[];
  metadata: SmartPlaylistMetadata;
}

/**
 * Port for smart playlist generation
 */
export interface ISmartPlaylistGenerator {
  generateSmartPlaylist(userId: string, config: SmartPlaylistConfig): Promise<SmartPlaylistResult>;
}

/**
 * Port for wave mix generation
 */
export interface IWaveMixGenerator {
  generateWaveMix(userId: string, config?: Partial<WaveMixConfig>): Promise<AutoPlaylist>;
  getAllAutoPlaylists(userId: string): Promise<AutoPlaylist[]>;
}

// Injection tokens
export const SMART_PLAYLIST_GENERATOR = Symbol('SMART_PLAYLIST_GENERATOR');
export const WAVE_MIX_GENERATOR = Symbol('WAVE_MIX_GENERATOR');
