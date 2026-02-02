/**
 * Stem Separator Port - Interface for audio stem separation services
 *
 * Implementations can use different backends:
 * - ONNX Runtime (Demucs ONNX model)
 * - node-audio-stem (Linux only)
 * - Spleeter (Python)
 */

export interface StemSeparationResult {
  vocalsPath: string;
  drumsPath: string;
  bassPath: string;
  otherPath: string;
  totalSizeBytes: number;
  modelUsed: string;
}

export interface StemSeparationOptions {
  outputDir: string;
  quality?: 'fast' | 'high'; // fast = less accurate but faster
  trackId: string; // For naming output files
}

export interface IStemSeparator {
  /**
   * Separate audio file into stems
   */
  separate(
    inputPath: string,
    options: StemSeparationOptions,
  ): Promise<StemSeparationResult>;

  /**
   * Check if the separator is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get separator name/version
   */
  getName(): string;

  /**
   * Get estimated processing time for a given duration
   */
  estimateProcessingTime(durationSeconds: number): number;

  /**
   * Get initialization error if any
   */
  getError?(): string | null;
}

export const STEM_SEPARATOR = 'IStemSeparator';
