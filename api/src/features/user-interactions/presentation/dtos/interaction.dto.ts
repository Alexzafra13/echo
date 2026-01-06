import { IsString, IsEnum, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ItemTypeDto {
  TRACK = 'track',
  ALBUM = 'album',
  ARTIST = 'artist',
  PLAYLIST = 'playlist',
}

export class SetRatingDto {
  @ApiProperty({ description: 'ID of the item to rate' })
  @IsString()
  itemId!: string;

  @ApiProperty({ enum: ItemTypeDto, description: 'Type of the item' })
  @IsEnum(ItemTypeDto)
  itemType!: ItemTypeDto;

  @ApiProperty({ description: 'Rating value (1-5 stars)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
}

export class GetUserInteractionsDto {
  @ApiProperty({ enum: ItemTypeDto, description: 'Filter by item type', required: false })
  @IsOptional()
  @IsEnum(ItemTypeDto)
  itemType?: ItemTypeDto;
}

export class GetItemSummaryDto {
  @ApiProperty({ description: 'ID of the item' })
  @IsString()
  itemId!: string;

  @ApiProperty({ enum: ItemTypeDto, description: 'Type of the item' })
  @IsEnum(ItemTypeDto)
  itemType!: ItemTypeDto;
}
