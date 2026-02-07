/**
 * DJ Module Configuration
 *
 * Centralized configuration for audio analysis and harmonic mixing.
 * All magic numbers and timeouts are defined here for easy maintenance.
 */

/**
 * Camelot Wheel Colors
 * Based on the standard Camelot/Mixed In Key color wheel.
 * Each position has a distinct color for visual identification.
 */
export const CAMELOT_COLORS: Record<string, { bg: string; text: string; name: string }> = {
  // Position 1 - Teal
  '1A': { bg: '#1DB4B4', text: '#FFFFFF', name: 'Teal' },
  '1B': { bg: '#14D4D4', text: '#000000', name: 'Cyan' },
  // Position 2 - Green-Teal
  '2A': { bg: '#1DB488', text: '#FFFFFF', name: 'Sea Green' },
  '2B': { bg: '#14D49C', text: '#000000', name: 'Mint' },
  // Position 3 - Green
  '3A': { bg: '#1DB454', text: '#FFFFFF', name: 'Green' },
  '3B': { bg: '#14D464', text: '#000000', name: 'Light Green' },
  // Position 4 - Yellow-Green
  '4A': { bg: '#5CB41D', text: '#FFFFFF', name: 'Lime' },
  '4B': { bg: '#7CD414', text: '#000000', name: 'Yellow-Green' },
  // Position 5 - Yellow
  '5A': { bg: '#B4A81D', text: '#FFFFFF', name: 'Olive' },
  '5B': { bg: '#D4C814', text: '#000000', name: 'Yellow' },
  // Position 6 - Orange/Pink
  '6A': { bg: '#D47894', text: '#FFFFFF', name: 'Rose' },
  '6B': { bg: '#F490AC', text: '#000000', name: 'Pink' },
  // Position 7 - Purple
  '7A': { bg: '#9454B4', text: '#FFFFFF', name: 'Purple' },
  '7B': { bg: '#B464D4', text: '#FFFFFF', name: 'Violet' },
  // Position 8 - Blue-Purple
  '8A': { bg: '#5454B4', text: '#FFFFFF', name: 'Indigo' },
  '8B': { bg: '#6464D4', text: '#FFFFFF', name: 'Blue-Violet' },
  // Position 9 - Blue
  '9A': { bg: '#1D54B4', text: '#FFFFFF', name: 'Blue' },
  '9B': { bg: '#1464D4', text: '#FFFFFF', name: 'Azure' },
  // Position 10 - Blue-Cyan
  '10A': { bg: '#1D88B4', text: '#FFFFFF', name: 'Ocean' },
  '10B': { bg: '#149CD4', text: '#000000', name: 'Sky Blue' },
  // Position 11 - Magenta
  '11A': { bg: '#B41D88', text: '#FFFFFF', name: 'Magenta' },
  '11B': { bg: '#D4149C', text: '#FFFFFF', name: 'Hot Pink' },
  // Position 12 - Cyan
  '12A': { bg: '#1DB4D4', text: '#000000', name: 'Turquoise' },
  '12B': { bg: '#14D4E8', text: '#000000', name: 'Aqua' },
} as const;

export const DJ_CONFIG = {
  /**
   * Audio Analysis Configuration
   */
  analysis: {
    /** Timeout for audio analysis in ms (5 minutes — accounts for queue depth when multiple analyses run concurrently) */
    timeout: 300_000,
    /** Timeout for worker startup in ms */
    workerStartupTimeout: 30_000,
    /** Valid BPM range */
    bpm: {
      min: 60,
      max: 200,
      /** BPM values above this are halved (likely double-time detection) */
      doubleTimeThreshold: 200,
      /** BPM values below this are doubled (likely half-time detection) */
      halfTimeThreshold: 60,
    },
    /** Concurrency for batch analysis */
    concurrency: 2,
  },

  /**
   * FFmpeg Configuration
   */
  ffmpeg: {
    /** Default timeout for FFmpeg operations in ms (5 minutes) */
    timeout: 5 * 60 * 1000,
    /** Max buffer for piped output (100MB) */
    maxBuffer: 100 * 1024 * 1024,
  },

  /**
   * Compatibility Scoring Configuration
   */
  compatibility: {
    /** Weight for key compatibility (Camelot wheel) */
    keyWeight: 0.45,
    /** Weight for tempo/BPM compatibility */
    tempoWeight: 0.35,
    /** Weight for energy level matching */
    energyWeight: 0.2,
    /** Minimum score to be considered "compatible" (0-1) */
    minCompatibleScore: 0.6,
    /** BPM tolerance for "same tempo" matching (%) */
    bpmTolerancePercent: 6,
  },
} as const;

/**
 * Type for DJ_CONFIG for type-safe access
 */
export type DjConfig = typeof DJ_CONFIG;
