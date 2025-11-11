import {
  UserStarred,
  UserRating,
  UserInteraction,
  Sentiment,
  ItemType,
  InteractionStats,
  ItemInteractionSummary,
} from '../entities/user-interaction.entity';

export interface IUserInteractionsRepository {
  // Like/Dislike operations
  setLike(userId: string, itemId: string, itemType: ItemType): Promise<UserStarred>;
  setDislike(userId: string, itemId: string, itemType: ItemType): Promise<UserStarred>;
  removeSentiment(userId: string, itemId: string, itemType: ItemType): Promise<void>;
  getSentiment(userId: string, itemId: string, itemType: ItemType): Promise<Sentiment | null>;

  // Rating operations
  setRating(userId: string, itemId: string, itemType: ItemType, rating: number): Promise<UserRating>;
  removeRating(userId: string, itemId: string, itemType: ItemType): Promise<void>;
  getRating(userId: string, itemId: string, itemType: ItemType): Promise<number | null>;

  // Bulk operations
  getUserInteractions(userId: string, itemType?: ItemType): Promise<UserInteraction[]>;
  getUserLikes(userId: string, itemType?: ItemType): Promise<UserStarred[]>;
  getUserDislikes(userId: string, itemType?: ItemType): Promise<UserStarred[]>;
  getUserRatings(userId: string, itemType?: ItemType): Promise<UserRating[]>;

  // Item statistics
  getItemInteractionSummary(itemId: string, itemType: ItemType, userId?: string): Promise<ItemInteractionSummary>;
  getItemsByUserSentiment(userId: string, sentiment: Sentiment, itemType?: ItemType): Promise<string[]>;

  // User statistics
  getUserInteractionStats(userId: string): Promise<InteractionStats>;
}
