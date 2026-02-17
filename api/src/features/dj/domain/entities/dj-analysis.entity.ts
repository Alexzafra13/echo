import {
  keyToCamelot as camelotUtilKeyToCamelot,
  areKeysCompatible,
  getSimpleHarmonicScore,
  isValidBpm,
  isValidEnergy,
} from '../utils/camelot.util';
import { DJ_CONFIG } from '../../config/dj.config';

export type DjAnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed';

export interface DjAnalysisProps {
  id: string;
  trackId: string;

  bpm?: number;
  key?: string;
  camelotKey?: string;
  energy?: number;
  rawEnergy?: number;
  danceability?: number;

  status: DjAnalysisStatus;
  analysisError?: string;

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

  static create(props: Omit<DjAnalysisProps, 'id' | 'createdAt' | 'updatedAt'>): DjAnalysis {
    if (props.bpm !== undefined && !isValidBpm(props.bpm)) {
      throw new Error(`Invalid BPM value: ${props.bpm}. Must be between 30 and 300.`);
    }

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

  get rawEnergy(): number | undefined {
    return this.props.rawEnergy;
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

  isHarmonicallyCompatibleWith(other: DjAnalysis): boolean {
    return areKeysCompatible(this.camelotKey, other.camelotKey);
  }

  isBpmCompatibleWith(other: DjAnalysis, tolerancePercent = DJ_CONFIG.compatibility.bpmTolerancePercent): boolean {
    if (!this.bpm || !other.bpm) {
      return false;
    }

    const diff = Math.abs(this.bpm - other.bpm) / this.bpm;
    return diff <= tolerancePercent / 100;
  }

  getBpmAdjustmentTo(targetBpm: number): number {
    if (!this.bpm) {
      return 0;
    }
    return ((targetBpm - this.bpm) / this.bpm) * 100;
  }

  getHarmonicScore(other: DjAnalysis): number {
    if (!this.camelotKey || !other.camelotKey) {
      return 0;
    }
    return getSimpleHarmonicScore(this.camelotKey, other.camelotKey);
  }

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
      rawEnergy: this.rawEnergy,
      danceability: this.danceability,
      status: this.status,
      analysisError: this.analysisError,
      analyzedAt: this.analyzedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
