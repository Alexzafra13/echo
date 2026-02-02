/**
 * DJ Module Configuration
 *
 * Centralized configuration for all DJ-related services.
 * All magic numbers and timeouts are defined here for easy maintenance.
 */

export const DJ_CONFIG = {
  /**
   * Audio Analysis Configuration
   */
  analysis: {
    /** Timeout for audio analysis in ms (2 minutes) */
    timeout: 120_000,
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
   * Stem Separation Configuration
   */
  stems: {
    /** Sample rate for processing (Hz) */
    sampleRate: 44100,
    /** Number of audio channels */
    channels: 2,
    /** Chunk size in samples (10 seconds) */
    chunkSize: 44100 * 10,
    /** Overlap between chunks in samples (1 second) */
    overlap: 44100 * 1,
    /** Concurrency for stem processing queue */
    concurrency: 1,
    /** Estimated processing time multiplier (2.5x realtime) */
    processingTimeMultiplier: 2.5,
  },

  /**
   * Tempo Cache Configuration
   */
  tempoCache: {
    /** FFmpeg atempo filter limits */
    atempo: {
      min: 0.5,
      max: 2.0,
    },
    /** Max tempo change per filter (same as atempo.min) */
    maxTempoChange: 0.5,
    /** Days to keep unused cache files */
    maxAgeDays: 30,
    /** Cleanup schedule (cron pattern: daily at 3:30 AM) */
    cleanupSchedule: '30 3 * * *',
  },

  /**
   * FFmpeg Configuration
   */
  ffmpeg: {
    /** Default timeout for FFmpeg operations in ms (5 minutes) */
    timeout: 5 * 60 * 1000,
    /** Max buffer for piped output (100MB) */
    maxBuffer: 100 * 1024 * 1024,
    /** MP3 encoding quality (VBR, 0=best, 9=worst) */
    mp3Quality: 2,
  },

  /**
   * Mixing & Transition Configuration
   */
  mixing: {
    /** Default transition duration in beats */
    defaultTransitionBeats: 16,
    /** Valid transition beat counts */
    validTransitionBeats: [8, 16, 32] as const,
    /** BPM tolerance for "same tempo" matching (±) */
    bpmTolerance: 2,
    /** Maximum BPM difference for viable transition */
    maxBpmDifference: 10,
  },

  /**
   * Compatibility Scoring Weights
   */
  compatibility: {
    /** Weight for key compatibility (Camelot wheel) */
    keyWeight: 0.4,
    /** Weight for tempo/BPM compatibility */
    tempoWeight: 0.3,
    /** Weight for energy level matching */
    energyWeight: 0.2,
    /** Weight for genre matching */
    genreWeight: 0.1,
    /** Minimum score to be considered "compatible" (0-1) */
    minCompatibleScore: 0.6,
  },

  /**
   * Directory Configuration (relative to data dir)
   */
  directories: {
    stems: 'stems',
    tempoCache: 'tempo-cache',
  },

  /**
   * Environment Variable Names
   * Used for ConfigService.get() with defaults from this config
   */
  envVars: {
    modelPath: 'DJ_MODEL_PATH',
    stemsDir: 'DJ_STEMS_DIR',
    dataDir: 'storage.data_dir',
  },
} as const;

/**
 * Type for DJ_CONFIG for type-safe access
 */
export type DjConfig = typeof DJ_CONFIG;
