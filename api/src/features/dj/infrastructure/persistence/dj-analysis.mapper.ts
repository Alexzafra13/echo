import { DjAnalysis, DjAnalysisProps } from '../../domain/entities/dj-analysis.entity';
import { DjAnalysis as DjAnalysisDb } from '../../../../infrastructure/database/schema';

export class DjAnalysisMapper {
  static toDomain(raw: DjAnalysisDb): DjAnalysis {
    return DjAnalysis.fromPrimitives({
      id: raw.id,
      trackId: raw.trackId,
      bpm: raw.bpm ?? undefined,
      key: raw.key ?? undefined,
      camelotKey: raw.camelotKey ?? undefined,
      energy: raw.energy ?? undefined,
      danceability: raw.danceability ?? undefined,
      status: raw.status as DjAnalysisProps['status'],
      analysisError: raw.analysisError ?? undefined,
      analyzedAt: raw.analyzedAt ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toDomainArray(raw: DjAnalysisDb[]): DjAnalysis[] {
    return raw.map((item) => this.toDomain(item));
  }

  static toPersistence(entity: DjAnalysis): Partial<DjAnalysisDb> {
    const primitives = entity.toPrimitives();
    return {
      id: primitives.id,
      trackId: primitives.trackId,
      bpm: primitives.bpm ?? null,
      key: primitives.key ?? null,
      camelotKey: primitives.camelotKey ?? null,
      energy: primitives.energy ?? null,
      danceability: primitives.danceability ?? null,
      status: primitives.status,
      analysisError: primitives.analysisError ?? null,
      analyzedAt: primitives.analyzedAt ?? null,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }
}
