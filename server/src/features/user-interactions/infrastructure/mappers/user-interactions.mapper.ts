import { UserStarred, UserRating, Sentiment, ItemType } from '../../domain/entities/user-interaction.entity';

export class UserInteractionsMapper {
  static toUserStarredDomain(raw: any): UserStarred {
    return {
      userId: raw.userId,
      starredId: raw.starredId,
      starredType: raw.starredType as ItemType,
      sentiment: raw.sentiment as Sentiment,
      starredAt: raw.starredAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  static toUserRatingDomain(raw: any): UserRating {
    return {
      userId: raw.userId,
      itemId: raw.itemId,
      itemType: raw.itemType as ItemType,
      rating: raw.rating,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  static toUserStarredDomainArray(raw: any[]): UserStarred[] {
    return raw.map(this.toUserStarredDomain);
  }

  static toUserRatingDomainArray(raw: any[]): UserRating[] {
    return raw.map(this.toUserRatingDomain);
  }
}
