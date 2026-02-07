/**
 * Audio Analyzer Port - Interface for audio analysis services
 *
 * Implementations can use different backends:
 * - Essentia.js (JavaScript/WASM)
 * - FFmpeg (for basic analysis)
 * - External APIs
 */

export interface AudioAnalysisResult {
  bpm: number;
  key: string; // Musical key (e.g., "Am", "C#m")
  energy: number; // 0.0 - 1.0
  danceability?: number; // 0.0 - 1.0
}

/** Hints from ID3 tags — lets the analyzer skip expensive algorithms when data is already available */
export interface AnalysisHints {
  bpm?: number; // Skip RhythmExtractor2013 if > 0
  key?: string; // Skip KeyExtractor if valid key
}

export interface IAudioAnalyzer {
  /**
   * Analyze audio file for DJ characteristics.
   * Pass hints to skip expensive BPM/Key detection when ID3 tags are available.
   */
  analyze(filePath: string, hints?: AnalysisHints): Promise<AudioAnalysisResult>;

  /**
   * Check if the analyzer is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get analyzer name/version
   */
  getName(): string;

  /**
   * Get initialization error if any
   */
  getError?(): string | null;
}

export const AUDIO_ANALYZER = 'IAudioAnalyzer';
