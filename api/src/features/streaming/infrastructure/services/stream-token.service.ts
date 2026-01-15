import { Injectable } from '@nestjs/common';
import { eq, lt, gte, and } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { streamTokens, users } from '@infrastructure/database/schema';
import { randomBytes } from 'crypto';

// Stream token expiration in hours (default: 24 hours)
// Shorter than JWT for security since tokens are passed in query params (visible in logs)
const STREAM_TOKEN_EXPIRY_HOURS = parseInt(process.env.STREAM_TOKEN_EXPIRY_HOURS || '24', 10);

@Injectable()
export class StreamTokenService {
  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Generate a new stream token for a user
   * Token expires after STREAM_TOKEN_EXPIRY_HOURS (default: 24 hours)
   * Shorter than JWT because stream tokens are passed in URL query params
   */
  async generateToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    // Generate random token (64 characters)
    const token = randomBytes(32).toString('hex');

    // Token expires based on config (default 24 hours)
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + STREAM_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Delete any existing tokens for this user (only one token per user)
    await this.drizzle.db
      .delete(streamTokens)
      .where(eq(streamTokens.userId, userId));

    // Create new token
    await this.drizzle.db
      .insert(streamTokens)
      .values({
        userId,
        token,
        expiresAt,
      });

    return { token, expiresAt };
  }

  /**
   * Validate a stream token and return the user ID
   * Returns null if token is invalid or expired
   */
  async validateToken(token: string): Promise<string | null> {
    // Get token with user info
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

    // Check if token is expired
    if (streamToken.token.expiresAt < new Date()) {
      // Delete expired token
      await this.drizzle.db
        .delete(streamTokens)
        .where(eq(streamTokens.id, streamToken.token.id));
      return null;
    }

    // Check if user is active
    if (!streamToken.user.isActive) {
      return null;
    }

    // Update last used timestamp
    await this.drizzle.db
      .update(streamTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(streamTokens.id, streamToken.token.id));

    return streamToken.token.userId;
  }

  /**
   * Get current token for a user
   */
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

  /**
   * Revoke token for a user
   */
  async revokeToken(userId: string): Promise<void> {
    await this.drizzle.db
      .delete(streamTokens)
      .where(eq(streamTokens.userId, userId));
  }

  /**
   * Clean up expired tokens (can be run as a cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.drizzle.db
      .delete(streamTokens)
      .where(lt(streamTokens.expiresAt, new Date()))
      .returning();

    return result.length;
  }
}
