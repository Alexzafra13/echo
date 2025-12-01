export type ItemType = 'track' | 'album' | 'artist' | 'playlist';
export type Sentiment = 'like' | 'dislike';

export interface UserInteraction {
  userId: string;
  itemId: string;
  itemType: ItemType;
  sentiment?: Sentiment;
  rating?: number; // 0 = not rated, 1-5 = rating value
  isStarred?: boolean;
  starredAt?: Date;
  ratedAt?: Date;
  updatedAt?: Date;
}

export interface UserStarred {
  userId: string;
  starredId: string;
  starredType: ItemType;
  sentiment: Sentiment;
  starredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRating {
  userId: string;
  itemId: string;
  itemType: ItemType;
  rating: number; // 1-5
  createdAt: Date;
  updatedAt: Date;
}

export interface InteractionStats {
  totalLikes: number;
  totalDislikes: number;
  totalRatings: number;
  averageRating: number;
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
