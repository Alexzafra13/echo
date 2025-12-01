import { ApiProperty } from '@nestjs/swagger';

export class ToggleLikeResponseDto {
  @ApiProperty({ description: 'Whether the item is liked after toggle' })
  liked!: boolean;

  @ApiProperty({ description: 'Timestamp when liked', required: false })
  likedAt?: Date;
}

export class ToggleDislikeResponseDto {
  @ApiProperty({ description: 'Whether the item is disliked after toggle' })
  disliked!: boolean;

  @ApiProperty({ description: 'Timestamp when disliked', required: false })
  dislikedAt?: Date;
}

export class RatingResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Item ID' })
  itemId!: string;

  @ApiProperty({ description: 'Item type' })
  itemType!: string;

  @ApiProperty({ description: 'Rating value (1-5)' })
  rating!: number;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt!: Date;
}

export class UserInteractionDto {
  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Item ID' })
  itemId!: string;

  @ApiProperty({ description: 'Item type' })
  itemType!: string;

  @ApiProperty({ description: 'Sentiment (like/dislike)', required: false })
  sentiment?: string;

  @ApiProperty({ description: 'Rating (1-5)', required: false })
  rating?: number;

  @ApiProperty({ description: 'Is starred', required: false })
  isStarred?: boolean;

  @ApiProperty({ description: 'Starred at timestamp', required: false })
  starredAt?: Date;

  @ApiProperty({ description: 'Rated at timestamp', required: false })
  ratedAt?: Date;
}

export class ItemInteractionSummaryDto {
  @ApiProperty({ description: 'Item ID' })
  itemId!: string;

  @ApiProperty({ description: 'Item type' })
  itemType!: string;

  @ApiProperty({ description: 'User sentiment (like/dislike)', required: false })
  userSentiment?: string;

  @ApiProperty({ description: 'User rating (1-5)', required: false })
  userRating?: number;

  @ApiProperty({ description: 'Total likes' })
  totalLikes!: number;

  @ApiProperty({ description: 'Total dislikes' })
  totalDislikes!: number;

  @ApiProperty({ description: 'Average rating' })
  averageRating!: number;

  @ApiProperty({ description: 'Total ratings' })
  totalRatings!: number;
}

export class InteractionStatsDto {
  @ApiProperty({ description: 'Total likes' })
  totalLikes!: number;

  @ApiProperty({ description: 'Total dislikes' })
  totalDislikes!: number;

  @ApiProperty({ description: 'Total ratings' })
  totalRatings!: number;

  @ApiProperty({ description: 'Average rating' })
  averageRating!: number;
}
