/**
 * DjAnalysis Entity - Audio analysis for DJ features
 *
 * Contains BPM, key, energy, and other audio characteristics
 * used for intelligent mixing and track recommendations.
 */

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

  // Beat detection
  beatgrid?: number[]; // Array of beat positions in seconds

  // Intro/outro for smart transitions
  introEnd?: number;
  outroStart?: number;

  // Status
  status: DjAnalysisStatus;
  analysisError?: string;

  // Timestamps
  analyzedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Camelot wheel mapping for harmonic mixing
const KEY_TO_CAMELOT: Record<string, string> = {
  // Minor keys (A column)
  'Abm': '1A', 'G#m': '1A',
  'Ebm': '2A', 'D#m': '2A',
  'Bbm': '3A', 'A#m': '3A',
  'Fm': '4A',
  'Cm': '5A',
  'Gm': '6A',
  'Dm': '7A',
  'Am': '8A',
  'Em': '9A',
  'Bm': '10A',
  'F#m': '11A', 'Gbm': '11A',
  'C#m': '12A', 'Dbm': '12A',
  // Major keys (B column)
  'B': '1B', 'Cb': '1B',
  'F#': '2B', 'Gb': '2B',
  'C#': '3B', 'Db': '3B',
  'Ab': '4B', 'G#': '4B',
  'Eb': '5B', 'D#': '5B',
  'Bb': '6B', 'A#': '6B',
  'F': '7B',
  'C': '8B',
  'G': '9B',
  'D': '10B',
  'A': '11B',
  'E': '12B',
};

export class DjAnalysis {
  private constructor(private readonly props: DjAnalysisProps) {}

  static create(props: Omit<DjAnalysisProps, 'id' | 'createdAt' | 'updatedAt'>): DjAnalysis {
    const now = new Date();
    return new DjAnalysis({
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...props,
    });
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

  get beatgrid(): number[] | undefined {
    return this.props.beatgrid;
  }

  get introEnd(): number | undefined {
    return this.props.introEnd;
  }

  get outroStart(): number | undefined {
    return this.props.outroStart;
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
    if (!this.camelotKey || !other.camelotKey) {
      return false;
    }

    const thisNum = parseInt(this.camelotKey.slice(0, -1));
    const thisLetter = this.camelotKey.slice(-1);
    const otherNum = parseInt(other.camelotKey.slice(0, -1));
    const otherLetter = other.camelotKey.slice(-1);

    // Same key
    if (this.camelotKey === other.camelotKey) {
      return true;
    }

    // Same number, different letter (relative major/minor)
    if (thisNum === otherNum && thisLetter !== otherLetter) {
      return true;
    }

    // Adjacent numbers on the wheel (+1 or -1, wrapping around 12)
    if (thisLetter === otherLetter) {
      const diff = Math.abs(thisNum - otherNum);
      if (diff === 1 || diff === 11) {
        return true;
      }
    }

    return false;
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
    if (!this.camelotKey || !other.camelotKey) {
      return 0;
    }

    if (this.camelotKey === other.camelotKey) {
      return 100; // Perfect match
    }

    const thisNum = parseInt(this.camelotKey.slice(0, -1));
    const thisLetter = this.camelotKey.slice(-1);
    const otherNum = parseInt(other.camelotKey.slice(0, -1));
    const otherLetter = other.camelotKey.slice(-1);

    // Relative major/minor
    if (thisNum === otherNum && thisLetter !== otherLetter) {
      return 90;
    }

    // Adjacent on wheel
    if (thisLetter === otherLetter) {
      const diff = Math.abs(thisNum - otherNum);
      if (diff === 1 || diff === 11) {
        return 80;
      }
    }

    // Two steps away
    const diff = Math.abs(thisNum - otherNum);
    if (diff === 2 || diff === 10) {
      return 50;
    }

    return 0; // Not compatible
  }

  /**
   * Convert musical key to Camelot notation
   */
  static keyToCamelot(key: string): string | undefined {
    return KEY_TO_CAMELOT[key];
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
      beatgrid: this.beatgrid,
      introEnd: this.introEnd,
      outroStart: this.outroStart,
      status: this.status,
      analysisError: this.analysisError,
      analyzedAt: this.analyzedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
