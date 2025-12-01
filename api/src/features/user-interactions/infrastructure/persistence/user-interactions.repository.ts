import { Injectable } from '@nestjs/common';
import { eq, and, desc, count, avg, sql } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { userStarred, userRatings } from '@infrastructure/database/schema';
import { IUserInteractionsRepository } from '../../domain/ports/user-interactions.repository.port';
import {
  UserStarred,
  UserRating,
  UserInteraction,
  Sentiment,
  ItemType,
  InteractionStats,
  ItemInteractionSummary,
} from '../../domain/entities/user-interaction.entity';
import { UserInteractionsMapper } from '../mappers/user-interactions.mapper';

@Injectable()
export class DrizzleUserInteractionsRepository implements IUserInteractionsRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  // Like/Dislike operations - Using upsert to avoid race conditions
  async setLike(userId: string, itemId: string, itemType: ItemType): Promise<UserStarred> {
    return this.setSentiment(userId, itemId, itemType, 'like');
  }

  async setDislike(userId: string, itemId: string, itemType: ItemType): Promise<UserStarred> {
    return this.setSentiment(userId, itemId, itemType, 'dislike');
  }

  /**
   * Set sentiment using upsert (INSERT ... ON CONFLICT) to avoid race conditions
   * This is atomic and thread-safe
   */
  private async setSentiment(
    userId: string,
    itemId: string,
    itemType: ItemType,
    sentiment: Sentiment,
  ): Promise<UserStarred> {
    const result = await this.drizzle.db
      .insert(userStarred)
      .values({
        userId,
        starredId: itemId,
        starredType: itemType,
        sentiment,
      })
      .onConflictDoUpdate({
        target: [userStarred.userId, userStarred.starredId, userStarred.starredType],
        set: {
          sentiment,
          updatedAt: new Date(),
        },
      })
      .returning();

    return UserInteractionsMapper.toUserStarredDomain(result[0]);
  }

  async removeSentiment(userId: string, itemId: string, itemType: ItemType): Promise<void> {
    await this.drizzle.db
      .delete(userStarred)
      .where(
        and(
          eq(userStarred.userId, userId),
          eq(userStarred.starredId, itemId),
          eq(userStarred.starredType, itemType),
        ),
      );
  }

  async getSentiment(userId: string, itemId: string, itemType: ItemType): Promise<Sentiment | null> {
    const result = await this.drizzle.db
      .select()
      .from(userStarred)
      .where(
        and(
          eq(userStarred.userId, userId),
          eq(userStarred.starredId, itemId),
          eq(userStarred.starredType, itemType),
        ),
      )
      .limit(1);

    return result[0] ? (result[0].sentiment as Sentiment) : null;
  }

  // Rating operations - Using upsert to avoid race conditions
  async setRating(userId: string, itemId: string, itemType: ItemType, rating: number): Promise<UserRating> {
    const result = await this.drizzle.db
      .insert(userRatings)
      .values({
        userId,
        itemId,
        itemType,
        rating,
      })
      .onConflictDoUpdate({
        target: [userRatings.userId, userRatings.itemId, userRatings.itemType],
        set: {
          rating,
          updatedAt: new Date(),
        },
      })
      .returning();

    return UserInteractionsMapper.toUserRatingDomain(result[0]);
  }

  async removeRating(userId: string, itemId: string, itemType: ItemType): Promise<void> {
    await this.drizzle.db
      .delete(userRatings)
      .where(
        and(
          eq(userRatings.userId, userId),
          eq(userRatings.itemId, itemId),
          eq(userRatings.itemType, itemType),
        ),
      );
  }

  async getRating(userId: string, itemId: string, itemType: ItemType): Promise<number | null> {
    const result = await this.drizzle.db
      .select()
      .from(userRatings)
      .where(
        and(
          eq(userRatings.userId, userId),
          eq(userRatings.itemId, itemId),
          eq(userRatings.itemType, itemType),
        ),
      )
      .limit(1);

    return result[0] ? result[0].rating : null;
  }

  // Bulk operations
  async getUserInteractions(userId: string, itemType?: ItemType): Promise<UserInteraction[]> {
    const starredCondition = itemType
      ? and(eq(userStarred.userId, userId), eq(userStarred.starredType, itemType))
      : eq(userStarred.userId, userId);

    const ratingsCondition = itemType
      ? and(eq(userRatings.userId, userId), eq(userRatings.itemType, itemType))
      : eq(userRatings.userId, userId);

    const [starred, ratings] = await Promise.all([
      this.drizzle.db
        .select()
        .from(userStarred)
        .where(starredCondition)
        .orderBy(desc(userStarred.starredAt)),
      this.drizzle.db
        .select()
        .from(userRatings)
        .where(ratingsCondition)
        .orderBy(desc(userRatings.updatedAt)),
    ]);

    // Combine starred and ratings into UserInteraction
    const interactionsMap = new Map<string, UserInteraction>();

    // Add starred items
    for (const star of starred) {
      const key = `${star.starredId}-${star.starredType}`;
      interactionsMap.set(key, {
        userId,
        itemId: star.starredId,
        itemType: star.starredType as ItemType,
        sentiment: star.sentiment as Sentiment,
        isStarred: true,
        starredAt: star.starredAt,
        updatedAt: star.updatedAt,
      });
    }

    // Add ratings
    for (const rating of ratings) {
      const key = `${rating.itemId}-${rating.itemType}`;
      const existing = interactionsMap.get(key);

      if (existing) {
        existing.rating = rating.rating;
        existing.ratedAt = rating.updatedAt;
      } else {
        interactionsMap.set(key, {
          userId,
          itemId: rating.itemId,
          itemType: rating.itemType as ItemType,
          rating: rating.rating,
          ratedAt: rating.updatedAt,
        });
      }
    }

    return Array.from(interactionsMap.values());
  }

  async getUserLikes(userId: string, itemType?: ItemType): Promise<UserStarred[]> {
    const condition = itemType
      ? and(eq(userStarred.userId, userId), eq(userStarred.sentiment, 'like'), eq(userStarred.starredType, itemType))
      : and(eq(userStarred.userId, userId), eq(userStarred.sentiment, 'like'));

    const starred = await this.drizzle.db
      .select()
      .from(userStarred)
      .where(condition)
      .orderBy(desc(userStarred.starredAt));

    return starred.map(UserInteractionsMapper.toUserStarredDomain);
  }

  async getUserDislikes(userId: string, itemType?: ItemType): Promise<UserStarred[]> {
    const condition = itemType
      ? and(eq(userStarred.userId, userId), eq(userStarred.sentiment, 'dislike'), eq(userStarred.starredType, itemType))
      : and(eq(userStarred.userId, userId), eq(userStarred.sentiment, 'dislike'));

    const starred = await this.drizzle.db
      .select()
      .from(userStarred)
      .where(condition)
      .orderBy(desc(userStarred.starredAt));

    return starred.map(UserInteractionsMapper.toUserStarredDomain);
  }

  async getUserRatings(userId: string, itemType?: ItemType): Promise<UserRating[]> {
    const condition = itemType
      ? and(eq(userRatings.userId, userId), eq(userRatings.itemType, itemType))
      : eq(userRatings.userId, userId);

    const ratings = await this.drizzle.db
      .select()
      .from(userRatings)
      .where(condition)
      .orderBy(desc(userRatings.updatedAt));

    return ratings.map(UserInteractionsMapper.toUserRatingDomain);
  }

  // Item statistics
  async getItemInteractionSummary(itemId: string, itemType: ItemType, userId?: string): Promise<ItemInteractionSummary> {
    const [likesResult, dislikesResult, ratingsData, userSentimentResult, userRatingResult] = await Promise.all([
      this.drizzle.db
        .select({ count: count() })
        .from(userStarred)
        .where(
          and(
            eq(userStarred.starredId, itemId),
            eq(userStarred.starredType, itemType),
            eq(userStarred.sentiment, 'like'),
          ),
        ),
      this.drizzle.db
        .select({ count: count() })
        .from(userStarred)
        .where(
          and(
            eq(userStarred.starredId, itemId),
            eq(userStarred.starredType, itemType),
            eq(userStarred.sentiment, 'dislike'),
          ),
        ),
      this.drizzle.db
        .select({
          avgRating: avg(userRatings.rating),
          count: count(),
        })
        .from(userRatings)
        .where(and(eq(userRatings.itemId, itemId), eq(userRatings.itemType, itemType))),
      userId
        ? this.drizzle.db
            .select()
            .from(userStarred)
            .where(
              and(
                eq(userStarred.userId, userId),
                eq(userStarred.starredId, itemId),
                eq(userStarred.starredType, itemType),
              ),
            )
            .limit(1)
        : Promise.resolve([]),
      userId
        ? this.drizzle.db
            .select()
            .from(userRatings)
            .where(
              and(
                eq(userRatings.userId, userId),
                eq(userRatings.itemId, itemId),
                eq(userRatings.itemType, itemType),
              ),
            )
            .limit(1)
        : Promise.resolve([]),
    ]);

    return {
      itemId,
      itemType,
      userSentiment: userSentimentResult[0] ? (userSentimentResult[0].sentiment as Sentiment) : undefined,
      userRating: userRatingResult[0] ? userRatingResult[0].rating : undefined,
      totalLikes: likesResult[0]?.count ?? 0,
      totalDislikes: dislikesResult[0]?.count ?? 0,
      averageRating: Number(ratingsData[0]?.avgRating) || 0,
      totalRatings: ratingsData[0]?.count ?? 0,
    };
  }

  async getItemsByUserSentiment(userId: string, sentiment: Sentiment, itemType?: ItemType): Promise<string[]> {
    const condition = itemType
      ? and(eq(userStarred.userId, userId), eq(userStarred.sentiment, sentiment), eq(userStarred.starredType, itemType))
      : and(eq(userStarred.userId, userId), eq(userStarred.sentiment, sentiment));

    const starred = await this.drizzle.db
      .select({ starredId: userStarred.starredId })
      .from(userStarred)
      .where(condition);

    return starred.map((s) => s.starredId);
  }

  // User statistics
  async getUserInteractionStats(userId: string): Promise<InteractionStats> {
    const [likesResult, dislikesResult, ratingsData] = await Promise.all([
      this.drizzle.db
        .select({ count: count() })
        .from(userStarred)
        .where(and(eq(userStarred.userId, userId), eq(userStarred.sentiment, 'like'))),
      this.drizzle.db
        .select({ count: count() })
        .from(userStarred)
        .where(and(eq(userStarred.userId, userId), eq(userStarred.sentiment, 'dislike'))),
      this.drizzle.db
        .select({
          avgRating: avg(userRatings.rating),
          count: count(),
        })
        .from(userRatings)
        .where(eq(userRatings.userId, userId)),
    ]);

    return {
      totalLikes: likesResult[0]?.count ?? 0,
      totalDislikes: dislikesResult[0]?.count ?? 0,
      totalRatings: ratingsData[0]?.count ?? 0,
      averageRating: Number(ratingsData[0]?.avgRating) || 0,
    };
  }
}
