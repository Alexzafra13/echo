import { DjAnalysis, DjAnalysisStatus } from '../../domain/entities/dj-analysis.entity';
import { DjAnalysis as DjAnalysisDb } from '../../../../infrastructure/database/schema';

const VALID_STATUSES: DjAnalysisStatus[] = ['pending', 'analyzing', 'completed', 'failed'];

function validateStatus(status: string): DjAnalysisStatus {
  if (VALID_STATUSES.includes(status as DjAnalysisStatus)) {
    return status as DjAnalysisStatus;
  }
  // Default to 'pending' for invalid values (static context, cannot inject logger)
  return 'pending';
}

export class DjAnalysisMapper {
  static toDomain(raw: DjAnalysisDb): DjAnalysis {
    return DjAnalysis.fromPrimitives({
      id: raw.id,
      trackId: raw.trackId,
      bpm: raw.bpm ?? undefined,
      key: raw.key ?? undefined,
      camelotKey: raw.camelotKey ?? undefined,
      energy: raw.energy ?? undefined,
      rawEnergy: raw.rawEnergy ?? undefined,
      danceability: raw.danceability ?? undefined,
      status: validateStatus(raw.status),
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
      rawEnergy: primitives.rawEnergy ?? null,
      danceability: primitives.danceability ?? null,
      status: primitives.status,
      analysisError: primitives.analysisError ?? null,
      analyzedAt: primitives.analyzedAt ?? null,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }
}
