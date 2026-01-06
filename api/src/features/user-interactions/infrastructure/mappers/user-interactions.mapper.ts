import { UserRating as UserRatingDb } from '@infrastructure/database/schema/play-stats';
import { UserRating, ItemType } from '../../domain/entities/user-interaction.entity';

export class UserInteractionsMapper {
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

  static toUserRatingDomainArray(raw: UserRatingDb[]): UserRating[] {
    return raw.map(this.toUserRatingDomain);
  }
}
