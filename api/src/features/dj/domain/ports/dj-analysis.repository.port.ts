import { DjAnalysis, DjAnalysisStatus } from '../entities/dj-analysis.entity';

export interface IDjAnalysisRepository {
  create(analysis: DjAnalysis): Promise<DjAnalysis>;
  findById(id: string): Promise<DjAnalysis | null>;
  findByTrackId(trackId: string): Promise<DjAnalysis | null>;
  findByStatus(status: DjAnalysisStatus): Promise<DjAnalysis[]>;
  findByTrackIds(trackIds: string[]): Promise<DjAnalysis[]>;
  update(analysis: DjAnalysis): Promise<DjAnalysis>;
  delete(id: string): Promise<boolean>;
  deleteByTrackId(trackId: string): Promise<boolean>;
  findCompatibleTracks(
    trackId: string,
    options?: {
      bpmTolerance?: number;
      limit?: number;
      minScore?: number;
    },
  ): Promise<DjAnalysis[]>;
  countPending(): Promise<number>;
  findTracksWithoutAnalysis(limit?: number): Promise<string[]>;
}

export const DJ_ANALYSIS_REPOSITORY = 'IDjAnalysisRepository';
