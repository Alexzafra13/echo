import { Injectable } from '@nestjs/common';
import { eq, and, desc, asc, max } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import {
  listeningSessions,
  listeningSessionParticipants,
  listeningSessionQueue,
  users,
  tracks,
  albums,
  artists,
} from '@infrastructure/database/schema';
import {
  IListeningSessionRepository,
  ParticipantWithUser,
  QueueItemWithTrack,
} from '../../domain/ports';
import {
  ListeningSession,
  ListeningSessionProps,
  SessionParticipantProps,
  SessionQueueItemProps,
  ParticipantRole,
} from '../../domain/entities';

@Injectable()
export class DrizzleListeningSessionRepository implements IListeningSessionRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  // Session CRUD
  async create(session: ListeningSession): Promise<ListeningSession> {
    const props = session.toPrimitives();
    const result = await this.drizzle.db
      .insert(listeningSessions)
      .values({
        id: props.id,
        hostId: props.hostId,
        name: props.name,
        inviteCode: props.inviteCode,
        isActive: props.isActive,
        currentTrackId: props.currentTrackId,
        currentPosition: props.currentPosition,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      })
      .returning();

    return this.toDomain(result[0]);
  }

  async findById(id: string): Promise<ListeningSession | null> {
    const result = await this.drizzle.db
      .select()
      .from(listeningSessions)
      .where(eq(listeningSessions.id, id))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async findByInviteCode(code: string): Promise<ListeningSession | null> {
    const result = await this.drizzle.db
      .select()
      .from(listeningSessions)
      .where(eq(listeningSessions.inviteCode, code))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async findActiveByHostId(hostId: string): Promise<ListeningSession | null> {
    const result = await this.drizzle.db
      .select()
      .from(listeningSessions)
      .where(
        and(
          eq(listeningSessions.hostId, hostId),
          eq(listeningSessions.isActive, true),
        ),
      )
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async update(id: string, session: ListeningSession): Promise<ListeningSession | null> {
    const props = session.toPrimitives();
    const result = await this.drizzle.db
      .update(listeningSessions)
      .set({
        currentTrackId: props.currentTrackId,
        currentPosition: props.currentPosition,
        isActive: props.isActive,
        updatedAt: new Date(),
      })
      .where(eq(listeningSessions.id, id))
      .returning();

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async end(id: string): Promise<boolean> {
    const result = await this.drizzle.db
      .update(listeningSessions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(listeningSessions.id, id))
      .returning();

    return result.length > 0;
  }

  // Participants
  async addParticipant(
    sessionId: string,
    userId: string,
    role: ParticipantRole,
  ): Promise<SessionParticipantProps> {
    const result = await this.drizzle.db
      .insert(listeningSessionParticipants)
      .values({ sessionId, userId, role })
      .returning();

    const r = result[0];
    return {
      id: r.id,
      sessionId: r.sessionId,
      userId: r.userId,
      role: r.role as ParticipantRole,
      joinedAt: r.joinedAt,
    };
  }

  async removeParticipant(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(listeningSessionParticipants)
      .where(
        and(
          eq(listeningSessionParticipants.sessionId, sessionId),
          eq(listeningSessionParticipants.userId, userId),
        ),
      )
      .returning();

    return result.length > 0;
  }

  async getParticipants(sessionId: string): Promise<ParticipantWithUser[]> {
    const result = await this.drizzle.db
      .select({
        participant: listeningSessionParticipants,
        user: users,
      })
      .from(listeningSessionParticipants)
      .innerJoin(users, eq(listeningSessionParticipants.userId, users.id))
      .where(eq(listeningSessionParticipants.sessionId, sessionId))
      .orderBy(listeningSessionParticipants.joinedAt);

    return result.map((r) => ({
      id: r.participant.id,
      sessionId: r.participant.sessionId,
      userId: r.participant.userId,
      username: r.user.username,
      name: r.user.name ?? undefined,
      hasAvatar: !!r.user.avatarPath,
      role: r.participant.role as ParticipantRole,
      joinedAt: r.participant.joinedAt,
    }));
  }

  async getParticipant(
    sessionId: string,
    userId: string,
  ): Promise<SessionParticipantProps | null> {
    const result = await this.drizzle.db
      .select()
      .from(listeningSessionParticipants)
      .where(
        and(
          eq(listeningSessionParticipants.sessionId, sessionId),
          eq(listeningSessionParticipants.userId, userId),
        ),
      )
      .limit(1);

    if (!result[0]) return null;

    const r = result[0];
    return {
      id: r.id,
      sessionId: r.sessionId,
      userId: r.userId,
      role: r.role as ParticipantRole,
      joinedAt: r.joinedAt,
    };
  }

  async updateParticipantRole(
    sessionId: string,
    userId: string,
    role: ParticipantRole,
  ): Promise<boolean> {
    const result = await this.drizzle.db
      .update(listeningSessionParticipants)
      .set({ role })
      .where(
        and(
          eq(listeningSessionParticipants.sessionId, sessionId),
          eq(listeningSessionParticipants.userId, userId),
        ),
      )
      .returning();

    return result.length > 0;
  }

  // Queue
  async addToQueue(
    sessionId: string,
    trackId: string,
    addedBy: string,
  ): Promise<SessionQueueItemProps> {
    return await this.drizzle.db.transaction(async (tx) => {
      // Get max position
      const maxResult = await tx
        .select({ maxPos: max(listeningSessionQueue.position) })
        .from(listeningSessionQueue)
        .where(eq(listeningSessionQueue.sessionId, sessionId));

      const nextPos = (maxResult[0]?.maxPos ?? 0) + 1;

      const result = await tx
        .insert(listeningSessionQueue)
        .values({ sessionId, trackId, addedBy, position: nextPos })
        .returning();

      const r = result[0];
      return {
        id: r.id,
        sessionId: r.sessionId,
        trackId: r.trackId,
        addedBy: r.addedBy,
        position: r.position,
        played: r.played,
        createdAt: r.createdAt,
      };
    });
  }

  async getQueue(sessionId: string): Promise<QueueItemWithTrack[]> {
    const result = await this.drizzle.db
      .select({
        queueItem: listeningSessionQueue,
        track: tracks,
        artist: artists,
        album: albums,
        addedByUser: users,
      })
      .from(listeningSessionQueue)
      .innerJoin(tracks, eq(listeningSessionQueue.trackId, tracks.id))
      .leftJoin(artists, eq(tracks.artistId, artists.id))
      .leftJoin(albums, eq(tracks.albumId, albums.id))
      .innerJoin(users, eq(listeningSessionQueue.addedBy, users.id))
      .where(eq(listeningSessionQueue.sessionId, sessionId))
      .orderBy(asc(listeningSessionQueue.position));

    return result.map((r) => ({
      id: r.queueItem.id,
      sessionId: r.queueItem.sessionId,
      trackId: r.queueItem.trackId,
      trackTitle: r.track.title,
      trackDuration: r.track.duration ?? 0,
      artistName: r.artist?.name ?? undefined,
      albumName: r.album?.name ?? undefined,
      albumId: r.track.albumId ?? undefined,
      addedBy: r.queueItem.addedBy,
      addedByUsername: r.addedByUser.username,
      position: r.queueItem.position,
      played: r.queueItem.played,
      createdAt: r.queueItem.createdAt,
    }));
  }

  async markPlayed(sessionId: string, position: number): Promise<boolean> {
    const result = await this.drizzle.db
      .update(listeningSessionQueue)
      .set({ played: true })
      .where(
        and(
          eq(listeningSessionQueue.sessionId, sessionId),
          eq(listeningSessionQueue.position, position),
        ),
      )
      .returning();

    return result.length > 0;
  }

  async getNextUnplayed(sessionId: string): Promise<QueueItemWithTrack | null> {
    const result = await this.drizzle.db
      .select({
        queueItem: listeningSessionQueue,
        track: tracks,
        artist: artists,
        album: albums,
        addedByUser: users,
      })
      .from(listeningSessionQueue)
      .innerJoin(tracks, eq(listeningSessionQueue.trackId, tracks.id))
      .leftJoin(artists, eq(tracks.artistId, artists.id))
      .leftJoin(albums, eq(tracks.albumId, albums.id))
      .innerJoin(users, eq(listeningSessionQueue.addedBy, users.id))
      .where(
        and(
          eq(listeningSessionQueue.sessionId, sessionId),
          eq(listeningSessionQueue.played, false),
        ),
      )
      .orderBy(asc(listeningSessionQueue.position))
      .limit(1);

    if (!result[0]) return null;

    const r = result[0];
    return {
      id: r.queueItem.id,
      sessionId: r.queueItem.sessionId,
      trackId: r.queueItem.trackId,
      trackTitle: r.track.title,
      trackDuration: r.track.duration ?? 0,
      artistName: r.artist?.name ?? undefined,
      albumName: r.album?.name ?? undefined,
      albumId: r.track.albumId ?? undefined,
      addedBy: r.queueItem.addedBy,
      addedByUsername: r.addedByUser.username,
      position: r.queueItem.position,
      played: r.queueItem.played,
      createdAt: r.queueItem.createdAt,
    };
  }

  async clearQueue(sessionId: string): Promise<boolean> {
    await this.drizzle.db
      .delete(listeningSessionQueue)
      .where(eq(listeningSessionQueue.sessionId, sessionId));

    return true;
  }

  private toDomain(row: typeof listeningSessions.$inferSelect): ListeningSession {
    return ListeningSession.fromPrimitives({
      id: row.id,
      hostId: row.hostId,
      name: row.name,
      inviteCode: row.inviteCode,
      isActive: row.isActive,
      currentTrackId: row.currentTrackId ?? undefined,
      currentPosition: row.currentPosition,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
