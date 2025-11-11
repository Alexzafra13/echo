import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
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
export class PrismaUserInteractionsRepository implements IUserInteractionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Like/Dislike operations
  async setLike(userId: string, itemId: string, itemType: ItemType): Promise<UserStarred> {
    const starred = await this.prisma.userStarred.upsert({
      where: {
        userId_starredId_starredType: {
          userId,
          starredId: itemId,
          starredType: itemType,
        },
      },
      update: {
        sentiment: 'like',
        updatedAt: new Date(),
      },
      create: {
        userId,
        starredId: itemId,
        starredType: itemType,
        sentiment: 'like',
      },
    });

    return UserInteractionsMapper.toUserStarredDomain(starred);
  }

  async setDislike(userId: string, itemId: string, itemType: ItemType): Promise<UserStarred> {
    const starred = await this.prisma.userStarred.upsert({
      where: {
        userId_starredId_starredType: {
          userId,
          starredId: itemId,
          starredType: itemType,
        },
      },
      update: {
        sentiment: 'dislike',
        updatedAt: new Date(),
      },
      create: {
        userId,
        starredId: itemId,
        starredType: itemType,
        sentiment: 'dislike',
      },
    });

    return UserInteractionsMapper.toUserStarredDomain(starred);
  }

  async removeSentiment(userId: string, itemId: string, itemType: ItemType): Promise<void> {
    await this.prisma.userStarred.deleteMany({
      where: {
        userId,
        starredId: itemId,
        starredType: itemType,
      },
    });
  }

  async getSentiment(userId: string, itemId: string, itemType: ItemType): Promise<Sentiment | null> {
    const starred = await this.prisma.userStarred.findUnique({
      where: {
        userId_starredId_starredType: {
          userId,
          starredId: itemId,
          starredType: itemType,
        },
      },
    });

    return starred ? (starred.sentiment as Sentiment) : null;
  }

  // Rating operations
  async setRating(userId: string, itemId: string, itemType: ItemType, rating: number): Promise<UserRating> {
    const userRating = await this.prisma.userRating.upsert({
      where: {
        userId_itemId_itemType: {
          userId,
          itemId,
          itemType,
        },
      },
      update: {
        rating,
        updatedAt: new Date(),
      },
      create: {
        userId,
        itemId,
        itemType,
        rating,
      },
    });

    return UserInteractionsMapper.toUserRatingDomain(userRating);
  }

  async removeRating(userId: string, itemId: string, itemType: ItemType): Promise<void> {
    await this.prisma.userRating.deleteMany({
      where: {
        userId,
        itemId,
        itemType,
      },
    });
  }

  async getRating(userId: string, itemId: string, itemType: ItemType): Promise<number | null> {
    const rating = await this.prisma.userRating.findUnique({
      where: {
        userId_itemId_itemType: {
          userId,
          itemId,
          itemType,
        },
      },
    });

    return rating ? rating.rating : null;
  }

  // Bulk operations
  async getUserInteractions(userId: string, itemType?: ItemType): Promise<UserInteraction[]> {
    const whereClause: any = { userId };
    if (itemType) {
      whereClause.starredType = itemType;
    }

    const [starred, ratings] = await Promise.all([
      this.prisma.userStarred.findMany({
        where: whereClause,
        orderBy: { starredAt: 'desc' },
      }),
      this.prisma.userRating.findMany({
        where: itemType ? { userId, itemType } : { userId },
        orderBy: { updatedAt: 'desc' },
      }),
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
    const starred = await this.prisma.userStarred.findMany({
      where: {
        userId,
        sentiment: 'like',
        ...(itemType && { starredType: itemType }),
      },
      orderBy: { starredAt: 'desc' },
    });

    return starred.map(UserInteractionsMapper.toUserStarredDomain);
  }

  async getUserDislikes(userId: string, itemType?: ItemType): Promise<UserStarred[]> {
    const starred = await this.prisma.userStarred.findMany({
      where: {
        userId,
        sentiment: 'dislike',
        ...(itemType && { starredType: itemType }),
      },
      orderBy: { starredAt: 'desc' },
    });

    return starred.map(UserInteractionsMapper.toUserStarredDomain);
  }

  async getUserRatings(userId: string, itemType?: ItemType): Promise<UserRating[]> {
    const ratings = await this.prisma.userRating.findMany({
      where: {
        userId,
        ...(itemType && { itemType }),
      },
      orderBy: { updatedAt: 'desc' },
    });

    return ratings.map(UserInteractionsMapper.toUserRatingDomain);
  }

  // Item statistics
  async getItemInteractionSummary(itemId: string, itemType: ItemType, userId?: string): Promise<ItemInteractionSummary> {
    const [likes, dislikes, ratingsData, userSentiment, userRating] = await Promise.all([
      this.prisma.userStarred.count({
        where: {
          starredId: itemId,
          starredType: itemType,
          sentiment: 'like',
        },
      }),
      this.prisma.userStarred.count({
        where: {
          starredId: itemId,
          starredType: itemType,
          sentiment: 'dislike',
        },
      }),
      this.prisma.userRating.aggregate({
        where: {
          itemId,
          itemType,
        },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      }),
      userId
        ? this.prisma.userStarred.findUnique({
            where: {
              userId_starredId_starredType: {
                userId,
                starredId: itemId,
                starredType: itemType,
              },
            },
          })
        : null,
      userId
        ? this.prisma.userRating.findUnique({
            where: {
              userId_itemId_itemType: {
                userId,
                itemId,
                itemType,
              },
            },
          })
        : null,
    ]);

    return {
      itemId,
      itemType,
      userSentiment: userSentiment ? (userSentiment.sentiment as Sentiment) : undefined,
      userRating: userRating ? userRating.rating : undefined,
      totalLikes: likes,
      totalDislikes: dislikes,
      averageRating: ratingsData._avg.rating || 0,
      totalRatings: ratingsData._count.rating,
    };
  }

  async getItemsByUserSentiment(userId: string, sentiment: Sentiment, itemType?: ItemType): Promise<string[]> {
    const starred = await this.prisma.userStarred.findMany({
      where: {
        userId,
        sentiment,
        ...(itemType && { starredType: itemType }),
      },
      select: {
        starredId: true,
      },
    });

    return starred.map((s) => s.starredId);
  }

  // User statistics
  async getUserInteractionStats(userId: string): Promise<InteractionStats> {
    const [likes, dislikes, ratingsData] = await Promise.all([
      this.prisma.userStarred.count({
        where: {
          userId,
          sentiment: 'like',
        },
      }),
      this.prisma.userStarred.count({
        where: {
          userId,
          sentiment: 'dislike',
        },
      }),
      this.prisma.userRating.aggregate({
        where: {
          userId,
        },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      }),
    ]);

    return {
      totalLikes: likes,
      totalDislikes: dislikes,
      totalRatings: ratingsData._count.rating,
      averageRating: ratingsData._avg.rating || 0,
    };
  }
}
