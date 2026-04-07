export type ItemType = 'track' | 'album' | 'artist' | 'playlist';

export interface UserInteraction {
  userId: string;
  itemId: string;
  itemType: ItemType;
  rating?: number; // 1-5 = rating value
  ratedAt?: Date;
  updatedAt?: Date;
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
  totalRatings: number;
  averageRating: number;
}

export interface ItemInteractionSummary {
  itemId: string;
  itemType: ItemType;
  userRating?: number;
  averageRating: number;
  totalRatings: number;
}
