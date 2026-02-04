import { Injectable } from '@nestjs/common';
import { eq, and, inArray, sql, between } from 'drizzle-orm';
import { DrizzleService } from '../../../../infrastructure/database/drizzle.service';
import { djAnalysis, tracks } from '../../../../infrastructure/database/schema';
import { DjAnalysis, DjAnalysisStatus } from '../../domain/entities/dj-analysis.entity';
import { IDjAnalysisRepository } from '../../domain/ports/dj-analysis.repository.port';
import { DjAnalysisMapper } from './dj-analysis.mapper';
import { getCompatibleCamelotKeys } from '../../domain/utils/camelot.util';
import { DJ_CONFIG } from '../../config/dj.config';
import { calculateCompatibility, TrackDjData } from '../../domain/services/dj-compatibility.service';

@Injectable()
export class DrizzleDjAnalysisRepository implements IDjAnalysisRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(analysis: DjAnalysis): Promise<DjAnalysis> {
    const data = DjAnalysisMapper.toPersistence(analysis);
    const result = await this.drizzle.db
      .insert(djAnalysis)
      .values(data as typeof djAnalysis.$inferInsert)
      .returning();

    return DjAnalysisMapper.toDomain(result[0]);
  }

  async findById(id: string): Promise<DjAnalysis | null> {
    const result = await this.drizzle.db
      .select()
      .from(djAnalysis)
      .where(eq(djAnalysis.id, id))
      .limit(1);

    return result[0] ? DjAnalysisMapper.toDomain(result[0]) : null;
  }

  async findByTrackId(trackId: string): Promise<DjAnalysis | null> {
    const result = await this.drizzle.db
      .select()
      .from(djAnalysis)
      .where(eq(djAnalysis.trackId, trackId))
      .limit(1);

    return result[0] ? DjAnalysisMapper.toDomain(result[0]) : null;
  }

  async findByStatus(status: DjAnalysisStatus): Promise<DjAnalysis[]> {
    const result = await this.drizzle.db
      .select()
      .from(djAnalysis)
      .where(eq(djAnalysis.status, status));

    return DjAnalysisMapper.toDomainArray(result);
  }

  async findByTrackIds(trackIds: string[]): Promise<DjAnalysis[]> {
    if (trackIds.length === 0) return [];

    const result = await this.drizzle.db
      .select()
      .from(djAnalysis)
      .where(inArray(djAnalysis.trackId, trackIds));

    return DjAnalysisMapper.toDomainArray(result);
  }

  async update(analysis: DjAnalysis): Promise<DjAnalysis> {
    const data = DjAnalysisMapper.toPersistence(analysis);
    const result = await this.drizzle.db
      .update(djAnalysis)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(djAnalysis.id, analysis.id))
      .returning();

    return DjAnalysisMapper.toDomain(result[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(djAnalysis)
      .where(eq(djAnalysis.id, id))
      .returning();

    return result.length > 0;
  }

  async deleteByTrackId(trackId: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(djAnalysis)
      .where(eq(djAnalysis.trackId, trackId))
      .returning();

    return result.length > 0;
  }

  async findCompatibleTracks(
    trackId: string,
    options: { bpmTolerance?: number; limit?: number; minScore?: number } = {},
  ): Promise<DjAnalysis[]> {
    const {
      bpmTolerance = DJ_CONFIG.compatibility.bpmTolerancePercent,
      limit = 20,
      minScore = DJ_CONFIG.compatibility.minCompatibleScore,
    } = options;

    // Get the source track analysis
    const source = await this.findByTrackId(trackId);
    if (!source || !source.bpm || !source.camelotKey) {
      return [];
    }

    // Calculate BPM range
    const bpmMin = source.bpm * (1 - bpmTolerance / 100);
    const bpmMax = source.bpm * (1 + bpmTolerance / 100);

    // Get compatible Camelot keys using centralized utility
    const compatibleKeys = getCompatibleCamelotKeys(source.camelotKey);

    // Fetch candidates (get more than needed to account for filtering)
    const fetchLimit = Math.ceil(limit * 1.5);

    const result = await this.drizzle.db
      .select()
      .from(djAnalysis)
      .where(
        and(
          eq(djAnalysis.status, 'completed'),
          sql`${djAnalysis.trackId} != ${trackId}`,
          between(djAnalysis.bpm, bpmMin, bpmMax),
          inArray(djAnalysis.camelotKey, compatibleKeys),
        ),
      )
      .limit(fetchLimit);

    const candidates = DjAnalysisMapper.toDomainArray(result);

    // Convert source to TrackDjData format
    const sourceData: TrackDjData = {
      trackId: source.trackId,
      bpm: source.bpm,
      key: source.key ?? null,
      camelotKey: source.camelotKey,
      energy: source.energy ?? null,
      danceability: source.danceability ?? null,
    };

    // Calculate compatibility scores and filter by minScore
    const minScorePercent = minScore * 100; // Convert 0.6 to 60
    const scoredCandidates = candidates
      .map((candidate) => {
        const candidateData: TrackDjData = {
          trackId: candidate.trackId,
          bpm: candidate.bpm ?? null,
          key: candidate.key ?? null,
          camelotKey: candidate.camelotKey ?? null,
          energy: candidate.energy ?? null,
          danceability: candidate.danceability ?? null,
        };
        const score = calculateCompatibility(sourceData, candidateData);
        return { candidate, score: score.overall };
      })
      .filter(({ score }) => score >= minScorePercent)
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, limit);

    return scoredCandidates.map(({ candidate }) => candidate);
  }

  async countPending(): Promise<number> {
    const result = await this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(djAnalysis)
      .where(eq(djAnalysis.status, 'pending'));

    return result[0]?.count ?? 0;
  }

  async findTracksWithoutAnalysis(limit = 100): Promise<string[]> {
    const result = await this.drizzle.db
      .select({ id: tracks.id })
      .from(tracks)
      .leftJoin(djAnalysis, eq(tracks.id, djAnalysis.trackId))
      .where(sql`${djAnalysis.id} IS NULL`)
      .limit(limit);

    return result.map((r) => r.id);
  }
}
