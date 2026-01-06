import {
  UserRating,
  UserInteraction,
  ItemType,
  InteractionStats,
  ItemInteractionSummary,
} from '../entities/user-interaction.entity';

export interface IUserInteractionsRepository {
  // Rating operations
  setRating(userId: string, itemId: string, itemType: ItemType, rating: number): Promise<UserRating>;
  removeRating(userId: string, itemId: string, itemType: ItemType): Promise<void>;
  getRating(userId: string, itemId: string, itemType: ItemType): Promise<number | null>;

  // Bulk operations
  getUserInteractions(userId: string, itemType?: ItemType): Promise<UserInteraction[]>;
  getUserRatings(userId: string, itemType?: ItemType): Promise<UserRating[]>;

  // Item statistics
  getItemInteractionSummary(itemId: string, itemType: ItemType, userId?: string): Promise<ItemInteractionSummary>;

  // User statistics
  getUserInteractionStats(userId: string): Promise<InteractionStats>;
}
