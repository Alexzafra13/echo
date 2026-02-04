/**
 * DjAnalysis Entity - Audio analysis for DJ features
 *
 * Contains BPM, key, energy, and other audio characteristics
 * used for intelligent mixing and track recommendations.
 */

import {
  keyToCamelot as camelotUtilKeyToCamelot,
  areKeysCompatible,
  getSimpleHarmonicScore,
  isValidBpm,
  isValidEnergy,
} from '../utils/camelot.util';

export type DjAnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed';

export interface DjAnalysisProps {
  id: string;
  trackId: string;

  // Audio analysis results
  bpm?: number;
  key?: string; // Musical key (e.g., "Am", "C#m")
  camelotKey?: string; // Camelot notation (e.g., "8A", "11B")
  energy?: number; // 0.0 - 1.0
  danceability?: number; // 0.0 - 1.0

  // Status
  status: DjAnalysisStatus;
  analysisError?: string;

  // Timestamps
  analyzedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DjAnalysisValidationError {
  field: string;
  message: string;
}

export class DjAnalysis {
  private constructor(private readonly props: DjAnalysisProps) {}

  /**
   * Create a new DjAnalysis with validation
   * @throws Error if BPM or energy values are out of valid range
   */
  static create(props: Omit<DjAnalysisProps, 'id' | 'createdAt' | 'updatedAt'>): DjAnalysis {
    // Validate BPM if provided
    if (props.bpm !== undefined && !isValidBpm(props.bpm)) {
      throw new Error(`Invalid BPM value: ${props.bpm}. Must be between 30 and 300.`);
    }

    // Validate energy if provided
    if (props.energy !== undefined && !isValidEnergy(props.energy)) {
      throw new Error(`Invalid energy value: ${props.energy}. Must be between 0 and 1.`);
    }

    const now = new Date();
    return new DjAnalysis({
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...props,
    });
  }

  /**
   * Validate analysis data without throwing
   * @returns Array of validation errors (empty if valid)
   */
  static validate(props: Partial<DjAnalysisProps>): DjAnalysisValidationError[] {
    const errors: DjAnalysisValidationError[] = [];

    if (props.bpm !== undefined && !isValidBpm(props.bpm)) {
      errors.push({ field: 'bpm', message: 'BPM must be between 30 and 300' });
    }

    if (props.energy !== undefined && !isValidEnergy(props.energy)) {
      errors.push({ field: 'energy', message: 'Energy must be between 0 and 1' });
    }

    if (props.danceability !== undefined && (props.danceability < 0 || props.danceability > 1)) {
      errors.push({ field: 'danceability', message: 'Danceability must be between 0 and 1' });
    }

    return errors;
  }

  static fromPrimitives(props: DjAnalysisProps): DjAnalysis {
    return new DjAnalysis(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get trackId(): string {
    return this.props.trackId;
  }

  get bpm(): number | undefined {
    return this.props.bpm;
  }

  get key(): string | undefined {
    return this.props.key;
  }

  get camelotKey(): string | undefined {
    return this.props.camelotKey;
  }

  get energy(): number | undefined {
    return this.props.energy;
  }

  get danceability(): number | undefined {
    return this.props.danceability;
  }

  get status(): DjAnalysisStatus {
    return this.props.status;
  }

  get analysisError(): string | undefined {
    return this.props.analysisError;
  }

  get analyzedAt(): Date | undefined {
    return this.props.analyzedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic methods

  /**
   * Check if two tracks are harmonically compatible using Camelot wheel
   * Compatible transitions: same key, +1/-1 on wheel, or relative major/minor
   */
  isHarmonicallyCompatibleWith(other: DjAnalysis): boolean {
    return areKeysCompatible(this.camelotKey, other.camelotKey);
  }

  /**
   * Check if BPM is compatible for mixing (within 6% tolerance)
   */
  isBpmCompatibleWith(other: DjAnalysis, tolerancePercent = 6): boolean {
    if (!this.bpm || !other.bpm) {
      return false;
    }

    const diff = Math.abs(this.bpm - other.bpm) / this.bpm;
    return diff <= tolerancePercent / 100;
  }

  /**
   * Calculate BPM adjustment needed to match another track
   */
  getBpmAdjustmentTo(targetBpm: number): number {
    if (!this.bpm) {
      return 0;
    }
    return ((targetBpm - this.bpm) / this.bpm) * 100;
  }

  /**
   * Get harmonic compatibility score (0-100)
   */
  getHarmonicScore(other: DjAnalysis): number {
    // Return 0 when keys are missing (entity-specific behavior)
    if (!this.camelotKey || !other.camelotKey) {
      return 0;
    }
    return getSimpleHarmonicScore(this.camelotKey, other.camelotKey);
  }

  /**
   * Convert musical key to Camelot notation
   */
  static keyToCamelot(key: string): string | undefined {
    return camelotUtilKeyToCamelot(key) ?? undefined;
  }

  isAnalyzed(): boolean {
    return this.status === 'completed';
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  isAnalyzing(): boolean {
    return this.status === 'analyzing';
  }

  isFailed(): boolean {
    return this.status === 'failed';
  }

  toPrimitives(): DjAnalysisProps {
    return {
      id: this.id,
      trackId: this.trackId,
      bpm: this.bpm,
      key: this.key,
      camelotKey: this.camelotKey,
      energy: this.energy,
      danceability: this.danceability,
      status: this.status,
      analysisError: this.analysisError,
      analyzedAt: this.analyzedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
