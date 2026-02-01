import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../../../infrastructure/database/drizzle.service';
import { djSessions } from '../../../../infrastructure/database/schema';
import {
  IDjSessionRepository,
  CreateDjSessionData,
  UpdateDjSessionData,
} from '../../domain/ports/dj-session.repository.port';
import { DjSessionEntity, DjSessionTrack } from '../../domain/entities/dj-session.entity';

@Injectable()
export class DrizzleDjSessionRepository implements IDjSessionRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(data: CreateDjSessionData): Promise<DjSessionEntity> {
    const [result] = await this.drizzle.db
      .insert(djSessions)
      .values({
        userId: data.userId,
        name: data.name,
        transitionType: data.transitionType || 'crossfade',
        transitionDuration: data.transitionDuration || 8,
        trackList: data.trackList,
      })
      .returning();

    return this.mapToEntity(result);
  }

  async findById(id: string): Promise<DjSessionEntity | null> {
    const [result] = await this.drizzle.db
      .select()
      .from(djSessions)
      .where(eq(djSessions.id, id))
      .limit(1);

    return result ? this.mapToEntity(result) : null;
  }

  async findByUserId(userId: string): Promise<DjSessionEntity[]> {
    const results = await this.drizzle.db
      .select()
      .from(djSessions)
      .where(eq(djSessions.userId, userId))
      .orderBy(djSessions.updatedAt);

    return results.map((r) => this.mapToEntity(r));
  }

  async update(id: string, data: UpdateDjSessionData): Promise<DjSessionEntity | null> {
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.transitionType !== undefined) updateData.transitionType = data.transitionType;
    if (data.transitionDuration !== undefined) updateData.transitionDuration = data.transitionDuration;
    if (data.trackList !== undefined) updateData.trackList = data.trackList;

    const [result] = await this.drizzle.db
      .update(djSessions)
      .set(updateData)
      .where(eq(djSessions.id, id))
      .returning();

    return result ? this.mapToEntity(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(djSessions)
      .where(eq(djSessions.id, id))
      .returning({ id: djSessions.id });

    return result.length > 0;
  }

  async addTrackToSession(sessionId: string, track: DjSessionTrack): Promise<DjSessionEntity | null> {
    const session = await this.findById(sessionId);
    if (!session) return null;

    const trackList = [...session.trackList, track];
    return this.update(sessionId, { trackList });
  }

  async removeTrackFromSession(sessionId: string, trackId: string): Promise<DjSessionEntity | null> {
    const session = await this.findById(sessionId);
    if (!session) return null;

    const trackList = session.trackList
      .filter((t) => t.trackId !== trackId)
      .map((t, i) => ({ ...t, order: i }));

    return this.update(sessionId, { trackList });
  }

  async reorderTracks(sessionId: string, trackIds: string[]): Promise<DjSessionEntity | null> {
    const session = await this.findById(sessionId);
    if (!session) return null;

    const trackMap = new Map(session.trackList.map((t) => [t.trackId, t]));
    const trackList = trackIds
      .map((id, index) => {
        const track = trackMap.get(id);
        if (track) {
          return { ...track, order: index };
        }
        return null;
      })
      .filter((t): t is DjSessionTrack => t !== null);

    return this.update(sessionId, { trackList });
  }

  private mapToEntity(data: typeof djSessions.$inferSelect): DjSessionEntity {
    return DjSessionEntity.fromPrimitives({
      id: data.id,
      userId: data.userId,
      name: data.name,
      transitionType: data.transitionType as 'crossfade' | 'mashup' | 'cut',
      transitionDuration: data.transitionDuration,
      trackList: (data.trackList as DjSessionTrack[]) || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
