import { Injectable } from '@nestjs/common';
import { eq, lt, gte, and } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { streamTokens, users } from '@infrastructure/database/schema';
import { randomBytes } from 'crypto';

// Expiración de tokens de streaming (contexto self-hosted, un token por usuario)
const STREAM_TOKEN_EXPIRY_HOURS = 24;

@Injectable()
export class StreamTokenService {
  constructor(private readonly drizzle: DrizzleService) {}

  async generateToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + STREAM_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await this.drizzle.db
      .delete(streamTokens)
      .where(eq(streamTokens.userId, userId));

    await this.drizzle.db
      .insert(streamTokens)
      .values({
        userId,
        token,
        expiresAt,
      });

    return { token, expiresAt };
  }

  async validateToken(token: string): Promise<string | null> {
    const result = await this.drizzle.db
      .select({
        token: streamTokens,
        user: users,
      })
      .from(streamTokens)
      .leftJoin(users, eq(streamTokens.userId, users.id))
      .where(eq(streamTokens.token, token))
      .limit(1);

    const streamToken = result[0];

    if (!streamToken || !streamToken.user) {
      return null;
    }

    if (streamToken.token.expiresAt < new Date()) {
      await this.drizzle.db
        .delete(streamTokens)
        .where(eq(streamTokens.id, streamToken.token.id));
      return null;
    }

    if (!streamToken.user.isActive) {
      return null;
    }

    await this.drizzle.db
      .update(streamTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(streamTokens.id, streamToken.token.id));

    return streamToken.token.userId;
  }

  async getUserToken(userId: string): Promise<{ token: string; expiresAt: Date } | null> {
    const result = await this.drizzle.db
      .select()
      .from(streamTokens)
      .where(
        and(
          eq(streamTokens.userId, userId),
          gte(streamTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const streamToken = result[0];

    if (!streamToken) {
      return null;
    }

    return {
      token: streamToken.token,
      expiresAt: streamToken.expiresAt,
    };
  }

  async revokeToken(userId: string): Promise<void> {
    await this.drizzle.db
      .delete(streamTokens)
      .where(eq(streamTokens.userId, userId));
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.drizzle.db
      .delete(streamTokens)
      .where(lt(streamTokens.expiresAt, new Date()))
      .returning();

    return result.length;
  }
}
