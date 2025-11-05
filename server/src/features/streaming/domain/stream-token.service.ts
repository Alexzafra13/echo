import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class StreamTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a new stream token for a user
   * Token expires after 30 days
   */
  async generateToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    // Generate random token (64 characters)
    const token = randomBytes(32).toString('hex');

    // Token expires in 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Delete any existing tokens for this user (only one token per user)
    await this.prisma.streamToken.deleteMany({
      where: { userId },
    });

    // Create new token
    await this.prisma.streamToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  /**
   * Validate a stream token and return the user ID
   * Returns null if token is invalid or expired
   */
  async validateToken(token: string): Promise<string | null> {
    const streamToken = await this.prisma.streamToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!streamToken) {
      return null;
    }

    // Check if token is expired
    if (streamToken.expiresAt < new Date()) {
      // Delete expired token
      await this.prisma.streamToken.delete({
        where: { id: streamToken.id },
      });
      return null;
    }

    // Check if user is active
    if (!streamToken.user.isActive) {
      return null;
    }

    // Update last used timestamp
    await this.prisma.streamToken.update({
      where: { id: streamToken.id },
      data: { lastUsedAt: new Date() },
    });

    return streamToken.userId;
  }

  /**
   * Get current token for a user
   */
  async getUserToken(userId: string): Promise<{ token: string; expiresAt: Date } | null> {
    const streamToken = await this.prisma.streamToken.findFirst({
      where: {
        userId,
        expiresAt: { gte: new Date() },
      },
    });

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
    await this.prisma.streamToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Clean up expired tokens (can be run as a cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.streamToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }
}
