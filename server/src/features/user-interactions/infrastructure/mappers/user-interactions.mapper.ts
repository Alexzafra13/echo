import { UserStarred as PrismaUserStarred, UserRating as PrismaUserRating } from '@prisma/client';
import { UserStarred, UserRating, Sentiment, ItemType } from '../../domain/entities/user-interaction.entity';

export class UserInteractionsMapper {
  static toUserStarredDomain(prisma: PrismaUserStarred): UserStarred {
    return {
      userId: prisma.userId,
      starredId: prisma.starredId,
      starredType: prisma.starredType as ItemType,
      sentiment: prisma.sentiment as Sentiment,
      starredAt: prisma.starredAt,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    };
  }

  static toUserRatingDomain(prisma: PrismaUserRating): UserRating {
    return {
      userId: prisma.userId,
      itemId: prisma.itemId,
      itemType: prisma.itemType as ItemType,
      rating: prisma.rating,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    };
  }

  static toUserStarredDomainArray(prisma: PrismaUserStarred[]): UserStarred[] {
    return prisma.map(this.toUserStarredDomain);
  }

  static toUserRatingDomainArray(prisma: PrismaUserRating[]): UserRating[] {
    return prisma.map(this.toUserRatingDomain);
  }
}
