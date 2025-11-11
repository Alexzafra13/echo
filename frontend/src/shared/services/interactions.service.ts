import axios from 'axios';

const API_URL = '/api/interactions';

export type ItemType = 'track' | 'album' | 'artist' | 'playlist';
export type Sentiment = 'like' | 'dislike';

export interface ToggleLikeResponse {
  liked: boolean;
  likedAt?: Date;
}

export interface ToggleDislikeResponse {
  disliked: boolean;
  dislikedAt?: Date;
}

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
  userSentiment?: Sentiment;
  userRating?: number;
  totalLikes: number;
  totalDislikes: number;
  averageRating: number;
  totalRatings: number;
}

/**
 * Toggle like on an item
 */
export async function toggleLike(itemId: string, itemType: ItemType): Promise<ToggleLikeResponse> {
  const response = await axios.post<ToggleLikeResponse>(
    `${API_URL}/like`,
    { itemId, itemType },
  );
  return response.data;
}

/**
 * Toggle dislike on an item
 */
export async function toggleDislike(itemId: string, itemType: ItemType): Promise<ToggleDislikeResponse> {
  const response = await axios.post<ToggleDislikeResponse>(
    `${API_URL}/dislike`,
    { itemId, itemType },
  );
  return response.data;
}

/**
 * Set rating for an item (1-5 stars)
 */
export async function setRating(
  itemId: string,
  itemType: ItemType,
  rating: number,
): Promise<RatingResponse> {
  const response = await axios.post<RatingResponse>(
    `${API_URL}/rating`,
    { itemId, itemType, rating },
  );
  return response.data;
}

/**
 * Remove rating from an item
 */
export async function removeRating(itemId: string, itemType: ItemType): Promise<void> {
  await axios.delete(`${API_URL}/rating/${itemType}/${itemId}`);
}

/**
 * Get interaction summary for an item
 */
export async function getItemInteractionSummary(
  itemId: string,
  itemType: ItemType,
): Promise<ItemInteractionSummary> {
  const response = await axios.get<ItemInteractionSummary>(
    `${API_URL}/item/${itemType}/${itemId}`,
  );
  return response.data;
}
