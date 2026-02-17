import { Injectable } from '@nestjs/common';
import { eq, desc, count } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { users } from '@infrastructure/database/schema';
import { User } from '../../domain/entities/user.entity';
import {
  IUserRepository,
  UserUpdateableFields
} from '../../domain/ports/user-repository.port';
import { UserMapper } from './user.mapper';

@Injectable()
export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] ? UserMapper.toDomain(result[0]) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return result[0] ? UserMapper.toDomain(result[0]) : null;
  }

  async findAll(skip: number, take: number): Promise<User[]> {
    const result = await this.drizzle.db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .offset(skip)
      .limit(take);

    return result.map(user => UserMapper.toDomain(user));
  }

  async count(): Promise<number> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(users);

    return result[0]?.count ?? 0;
  }

  async create(user: User): Promise<User> {
    const primitives = user.toPrimitives();

    const result = await this.drizzle.db
      .insert(users)
      .values({
        id: primitives.id,
        username: primitives.username,
        passwordHash: primitives.passwordHash,
        name: primitives.name || null,
        isActive: primitives.isActive,
        isAdmin: primitives.isAdmin,
        theme: primitives.theme,
        language: primitives.language,
        mustChangePassword: primitives.mustChangePassword,
        lastLoginAt: null,
        lastAccessAt: null,
        isPublicProfile: primitives.isPublicProfile,
        showTopTracks: primitives.showTopTracks,
        showTopArtists: primitives.showTopArtists,
        showTopAlbums: primitives.showTopAlbums,
        showPlaylists: primitives.showPlaylists,
        bio: primitives.bio || null,
        createdAt: primitives.createdAt,
        updatedAt: primitives.updatedAt,
      })
      .returning();

    return UserMapper.toDomain(result[0]);
  }

  async updatePartial(
    id: string,
    data: Partial<UserUpdateableFields>,
  ): Promise<User> {
    const result = await this.drizzle.db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return UserMapper.toDomain(result[0]);
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.drizzle.db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateAdminStatus(userId: string, isAdmin: boolean): Promise<void> {
    await this.drizzle.db
      .update(users)
      .set({
        isAdmin,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async delete(userId: string): Promise<void> {
    await this.drizzle.db
      .delete(users)
      .where(eq(users.id, userId));
  }
}