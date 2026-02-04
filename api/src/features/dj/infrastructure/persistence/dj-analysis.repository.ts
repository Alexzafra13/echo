import { Injectable } from '@nestjs/common';
import { eq, and, inArray, sql, between } from 'drizzle-orm';
import { DrizzleService } from '../../../../infrastructure/database/drizzle.service';
import { djAnalysis, tracks } from '../../../../infrastructure/database/schema';
import { DjAnalysis, DjAnalysisStatus } from '../../domain/entities/dj-analysis.entity';
import { IDjAnalysisRepository } from '../../domain/ports/dj-analysis.repository.port';
import { DjAnalysisMapper } from './dj-analysis.mapper';
import { getCompatibleCamelotKeys } from '../../domain/utils/camelot.util';

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
    options: { bpmTolerance?: number; limit?: number } = {},
  ): Promise<DjAnalysis[]> {
    const { bpmTolerance = 6, limit = 20 } = options;

    // Get the source track analysis
    const source = await this.findByTrackId(trackId);
    if (!source || !source.bpm || !source.camelotKey) {
      return [];
    }

    // Calculate BPM range
    const bpmMin = source.bpm * (1 - bpmTolerance / 100);
    const bpmMax = source.bpm * (1 + bpmTolerance / 100);

    // Get compatible Camelot keys using centralized utility
    // Keys are ordered by compatibility: same key first, then adjacent, etc.
    const compatibleKeys = getCompatibleCamelotKeys(source.camelotKey);

    // Build CASE expression for ordering by key compatibility
    // Same key gets priority 1, then adjacent keys get 2, etc.
    const keyPriorityCases = compatibleKeys
      .map((key, index) => `WHEN ${djAnalysis.camelotKey.name} = '${key}' THEN ${index}`)
      .join(' ');
    const keyPriorityExpr = sql.raw(`CASE ${keyPriorityCases} ELSE 999 END`);

    // BPM closeness: absolute difference from source BPM
    const bpmCloseness = sql`ABS(${djAnalysis.bpm} - ${source.bpm})`;

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
      .orderBy(keyPriorityExpr, bpmCloseness)
      .limit(limit);

    return DjAnalysisMapper.toDomainArray(result);
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
