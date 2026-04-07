import { Injectable } from '@nestjs/common';
import { eq, and, count } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { playlistCollaborators, users } from '@infrastructure/database/schema';
import {
  ICollaboratorRepository,
  CollaboratorWithUser,
} from '../../domain/ports/collaborator-repository.port';
import { PlaylistCollaborator, CollaboratorRole } from '../../domain/entities/playlist-collaborator.entity';

@Injectable()
export class DrizzleCollaboratorRepository implements ICollaboratorRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(collaborator: PlaylistCollaborator): Promise<PlaylistCollaborator> {
    const props = collaborator.toPrimitives();
    const result = await this.drizzle.db
      .insert(playlistCollaborators)
      .values({
        id: props.id,
        playlistId: props.playlistId,
        userId: props.userId,
        role: props.role,
        status: props.status,
        invitedBy: props.invitedBy,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      })
      .returning();

    return this.toDomain(result[0]);
  }

  async findById(id: string): Promise<PlaylistCollaborator | null> {
    const result = await this.drizzle.db
      .select()
      .from(playlistCollaborators)
      .where(eq(playlistCollaborators.id, id))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async findByPlaylistAndUser(
    playlistId: string,
    userId: string,
  ): Promise<PlaylistCollaborator | null> {
    const result = await this.drizzle.db
      .select()
      .from(playlistCollaborators)
      .where(
        and(
          eq(playlistCollaborators.playlistId, playlistId),
          eq(playlistCollaborators.userId, userId),
        ),
      )
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async findByPlaylistId(playlistId: string): Promise<CollaboratorWithUser[]> {
    const result = await this.drizzle.db
      .select({
        collaborator: playlistCollaborators,
        user: users,
      })
      .from(playlistCollaborators)
      .innerJoin(users, eq(playlistCollaborators.userId, users.id))
      .where(eq(playlistCollaborators.playlistId, playlistId))
      .orderBy(playlistCollaborators.createdAt);

    return result.map((r) => ({
      id: r.collaborator.id,
      playlistId: r.collaborator.playlistId,
      userId: r.collaborator.userId,
      username: r.user.username,
      name: r.user.name ?? undefined,
      hasAvatar: !!r.user.avatarPath,
      role: r.collaborator.role,
      status: r.collaborator.status,
      invitedBy: r.collaborator.invitedBy,
      createdAt: r.collaborator.createdAt,
    }));
  }

  async findByUserId(userId: string): Promise<PlaylistCollaborator[]> {
    const result = await this.drizzle.db
      .select()
      .from(playlistCollaborators)
      .where(eq(playlistCollaborators.userId, userId))
      .orderBy(playlistCollaborators.createdAt);

    return result.map((r) => this.toDomain(r));
  }

  async updateStatus(id: string, status: string): Promise<PlaylistCollaborator | null> {
    const result = await this.drizzle.db
      .update(playlistCollaborators)
      .set({ status, updatedAt: new Date() })
      .where(eq(playlistCollaborators.id, id))
      .returning();

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async updateRole(id: string, role: CollaboratorRole): Promise<PlaylistCollaborator | null> {
    const result = await this.drizzle.db
      .update(playlistCollaborators)
      .set({ role, updatedAt: new Date() })
      .where(eq(playlistCollaborators.id, id))
      .returning();

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(playlistCollaborators)
      .where(eq(playlistCollaborators.id, id))
      .returning();

    return result.length > 0;
  }

  async deleteByPlaylistAndUser(playlistId: string, userId: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(playlistCollaborators)
      .where(
        and(
          eq(playlistCollaborators.playlistId, playlistId),
          eq(playlistCollaborators.userId, userId),
        ),
      )
      .returning();

    return result.length > 0;
  }

  async isCollaborator(playlistId: string, userId: string): Promise<boolean> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(playlistCollaborators)
      .where(
        and(
          eq(playlistCollaborators.playlistId, playlistId),
          eq(playlistCollaborators.userId, userId),
          eq(playlistCollaborators.status, 'accepted'),
        ),
      );

    return (result[0]?.count ?? 0) > 0;
  }

  async isEditor(playlistId: string, userId: string): Promise<boolean> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(playlistCollaborators)
      .where(
        and(
          eq(playlistCollaborators.playlistId, playlistId),
          eq(playlistCollaborators.userId, userId),
          eq(playlistCollaborators.status, 'accepted'),
          eq(playlistCollaborators.role, 'editor'),
        ),
      );

    return (result[0]?.count ?? 0) > 0;
  }

  async hasAccess(playlistId: string, userId: string): Promise<boolean> {
    // hasAccess = accepted collaborator (any role)
    return this.isCollaborator(playlistId, userId);
  }

  private toDomain(row: typeof playlistCollaborators.$inferSelect): PlaylistCollaborator {
    return PlaylistCollaborator.fromPrimitives({
      id: row.id,
      playlistId: row.playlistId,
      userId: row.userId,
      role: row.role as CollaboratorRole,
      status: row.status as 'pending' | 'accepted',
      invitedBy: row.invitedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
