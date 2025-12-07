import {
  UserStarred as UserStarredDb,
  UserRating as UserRatingDb,
} from '@infrastructure/database/schema/play-stats';
import { UserStarred, UserRating, Sentiment, ItemType } from '../../domain/entities/user-interaction.entity';

export class UserInteractionsMapper {
  static toUserStarredDomain(raw: UserStarredDb): UserStarred {
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

  static toUserRatingDomain(raw: UserRatingDb): UserRating {
    return {
      userId: raw.userId,
      itemId: raw.itemId,
      itemType: raw.itemType as ItemType,
      rating: raw.rating,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  static toUserStarredDomainArray(raw: UserStarredDb[]): UserStarred[] {
    return raw.map(this.toUserStarredDomain);
  }

  static toUserRatingDomainArray(raw: UserRatingDb[]): UserRating[] {
    return raw.map(this.toUserRatingDomain);
  }
}
