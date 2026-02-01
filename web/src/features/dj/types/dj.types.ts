/**
 * DJ Flow Types
 *
 * Types for DJ mixing features including track analysis,
 * harmonic compatibility, and transition calculations.
 */

// ============================================
// Analysis Types
// ============================================

export interface DjAnalysis {
  id: string;
  trackId: string;
  bpm: number | null;
  key: string | null;
  camelotKey: string | null;
  energy: number | null;
  danceability: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  analyzedAt: string | null;
}

export interface TrackWithAnalysis {
  trackId: string;
  title: string;
  artist: string;
  bpm: number | null;
  key: string | null;
  camelotKey: string | null;
  energy: number | null;
}

// ============================================
// Compatibility Types
// ============================================

export interface TrackCompatibility {
  trackId: string;
  title: string;
  artist: string;
  bpm: number | null;
  key: string | null;
  camelotKey: string | null;
  harmonicScore: number;
  bpmDifference: number;
  overallScore: number;
  recommendedTransition: TransitionType;
  canMashup: boolean;
}

export type TransitionType = 'crossfade' | 'cut' | 'mashup' | 'echo_out';

// ============================================
// Transition Types
// ============================================

export interface TransitionParams {
  trackAId: string;
  trackBId: string;
  type?: TransitionType;
  durationBeats?: number;
}

export interface TransitionResult {
  type: TransitionType;
  startTimeA: number;
  startTimeB: number;
  duration: number;
  bpmAdjustment: number | null;
  description: string;
}

// ============================================
// DJ Status Types
// ============================================

export interface DjSystemStatus {
  analysis: {
    isRunning: boolean;
    pendingTracks: number;
    processedInSession: number;
    concurrency: number;
    backend: string;
  };
  stems: {
    isRunning: boolean;
    pendingTracks: number;
    processedInSession: number;
    concurrency: number;
    backend: string;
    isAvailable: boolean;
  };
}

// ============================================
// DJ Flow Settings
// ============================================

export interface DjFlowSettings {
  enabled: boolean;
  reorderQueue: boolean;
  syncBpm: boolean;
  transitionBeats: 8 | 16 | 32;
  priority: 'harmonic' | 'energy' | 'bpm';
}

// ============================================
// Queue Types for DJ Flow
// ============================================

export interface DjQueueItem {
  trackId: string;
  analysis: DjAnalysis | null;
  compatibilityWithNext: TrackCompatibility | null;
  transition: TransitionResult | null;
}

// ============================================
// API Response Types
// ============================================

export interface AnalyzeResponse {
  message: string;
  trackId: string;
  status: string;
}

export interface AnalyzePlaylistResponse {
  message: string;
  playlistId: string;
  tracksQueued: number;
}

export interface CompatibleTracksResponse {
  sourceTrackId: string;
  compatibleTracks: TrackCompatibility[];
}

// ============================================
// DJ Suggestions Types
// ============================================

export interface CompatibilityScore {
  overall: number;
  bpmScore: number;
  keyScore: number;
  energyScore: number;
  bpmDiff: number;
  keyCompatibility: 'perfect' | 'compatible' | 'energy_boost' | 'incompatible';
  energyDiff: number;
  canBeatmatch: boolean;
  suggestedTransition: 'smooth' | 'energy_up' | 'energy_down' | 'key_change';
}

export interface DjSuggestion {
  trackId: string;
  title: string;
  artist: string;
  albumName: string | null;
  bpm: number | null;
  key: string | null;
  camelotKey: string | null;
  energy: number | null;
  compatibility: CompatibilityScore;
}

export interface DjSuggestionsResponse {
  currentTrack: {
    trackId: string;
    title: string;
    bpm: number | null;
    key: string | null;
    camelotKey: string | null;
    energy: number | null;
  } | null;
  suggestions: DjSuggestion[];
  compatibleKeys: string[];
}
