import { AutoPlaylist, SmartPlaylistConfig, TrackScore, WaveMixConfig } from '../entities/track-score.entity';

/**
 * Port for smart playlist generation
 */
export interface ISmartPlaylistGenerator {
  generateSmartPlaylist(
    userId: string,
    config: SmartPlaylistConfig,
  ): Promise<{ tracks: TrackScore[]; metadata: any }>;
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
