import { Injectable } from '@nestjs/common';
import { eq, and, desc, count, avg } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { userRatings } from '@infrastructure/database/schema';
import { IUserInteractionsRepository } from '../../domain/ports/user-interactions.repository.port';
import {
  UserRating,
  UserInteraction,
  ItemType,
  InteractionStats,
  ItemInteractionSummary,
} from '../../domain/entities/user-interaction.entity';
import { UserInteractionsMapper } from '../mappers/user-interactions.mapper';

@Injectable()
export class DrizzleUserInteractionsRepository implements IUserInteractionsRepository {
  constructor(private readonly drizzle: DrizzleService) {}

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
    const condition = itemType
      ? and(eq(userRatings.userId, userId), eq(userRatings.itemType, itemType))
      : eq(userRatings.userId, userId);

    const ratings = await this.drizzle.db
      .select()
      .from(userRatings)
      .where(condition)
      .orderBy(desc(userRatings.updatedAt));

    return ratings.map((rating) => ({
      userId,
      itemId: rating.itemId,
      itemType: rating.itemType as ItemType,
      rating: rating.rating,
      ratedAt: rating.updatedAt,
    }));
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
    const [ratingsData, userRatingResult] = await Promise.all([
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
      userRating: userRatingResult[0] ? userRatingResult[0].rating : undefined,
      averageRating: Number(ratingsData[0]?.avgRating) || 0,
      totalRatings: ratingsData[0]?.count ?? 0,
    };
  }

  // User statistics
  async getUserInteractionStats(userId: string): Promise<InteractionStats> {
    const ratingsData = await this.drizzle.db
      .select({
        avgRating: avg(userRatings.rating),
        count: count(),
      })
      .from(userRatings)
      .where(eq(userRatings.userId, userId));

    return {
      totalRatings: ratingsData[0]?.count ?? 0,
      averageRating: Number(ratingsData[0]?.avgRating) || 0,
    };
  }
}
