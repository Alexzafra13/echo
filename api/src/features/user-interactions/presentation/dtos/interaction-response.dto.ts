import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ description: 'Rating (1-5)', required: false })
  rating?: number;

  @ApiProperty({ description: 'Rated at timestamp', required: false })
  ratedAt?: Date;
}

export class ItemInteractionSummaryDto {
  @ApiProperty({ description: 'Item ID' })
  itemId!: string;

  @ApiProperty({ description: 'Item type' })
  itemType!: string;

  @ApiProperty({ description: 'User rating (1-5)', required: false })
  userRating?: number;

  @ApiProperty({ description: 'Average rating' })
  averageRating!: number;

  @ApiProperty({ description: 'Total ratings' })
  totalRatings!: number;
}

export class InteractionStatsDto {
  @ApiProperty({ description: 'Total ratings' })
  totalRatings!: number;

  @ApiProperty({ description: 'Average rating' })
  averageRating!: number;
}
