import { apiClient } from './api';

export type ItemType = 'track' | 'album' | 'artist' | 'playlist';

export interface RatingResponse {
  userId: string;
  itemId: string;
  itemType: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemInteractionSummary {
  itemId: string;
  itemType: ItemType;
  userRating?: number;
  averageRating: number;
  totalRatings: number;
}

/**
 * Set rating for an item (1-5 stars)
 */
export async function setRating(
  itemId: string,
  itemType: ItemType,
  rating: number,
): Promise<RatingResponse> {
  const response = await apiClient.post<RatingResponse>(
    '/interactions/rating',
    { itemId, itemType, rating },
  );
  return response.data;
}

/**
 * Remove rating from an item
 */
export async function removeRating(itemId: string, itemType: ItemType): Promise<void> {
  await apiClient.delete(`/interactions/rating/${itemType}/${itemId}`);
}

/**
 * Get interaction summary for an item
 */
export async function getItemInteractionSummary(
  itemId: string,
  itemType: ItemType,
): Promise<ItemInteractionSummary> {
  const response = await apiClient.get<ItemInteractionSummary>(
    `/interactions/item/${itemType}/${itemId}`,
  );
  return response.data;
}
