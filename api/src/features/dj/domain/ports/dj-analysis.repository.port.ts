import { DjAnalysis, DjAnalysisStatus } from '../entities/dj-analysis.entity';

export interface IDjAnalysisRepository {
  /**
   * Create a new DJ analysis record
   */
  create(analysis: DjAnalysis): Promise<DjAnalysis>;

  /**
   * Find analysis by ID
   */
  findById(id: string): Promise<DjAnalysis | null>;

  /**
   * Find analysis by track ID
   */
  findByTrackId(trackId: string): Promise<DjAnalysis | null>;

  /**
   * Find all analyses by status
   */
  findByStatus(status: DjAnalysisStatus): Promise<DjAnalysis[]>;

  /**
   * Find analyses for multiple track IDs
   */
  findByTrackIds(trackIds: string[]): Promise<DjAnalysis[]>;

  /**
   * Update an existing analysis
   */
  update(analysis: DjAnalysis): Promise<DjAnalysis>;

  /**
   * Delete analysis by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete analysis by track ID
   */
  deleteByTrackId(trackId: string): Promise<boolean>;

  /**
   * Find tracks compatible with a given track (by BPM and key)
   */
  findCompatibleTracks(
    trackId: string,
    options?: {
      bpmTolerance?: number; // percentage
      limit?: number;
    },
  ): Promise<DjAnalysis[]>;

  /**
   * Count pending analyses
   */
  countPending(): Promise<number>;

  /**
   * Get tracks without analysis
   */
  findTracksWithoutAnalysis(limit?: number): Promise<string[]>;
}

export const DJ_ANALYSIS_REPOSITORY = 'IDjAnalysisRepository';
