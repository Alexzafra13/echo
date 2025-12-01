import { IsString, IsOptional, IsInt, Min, Max, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateScoreDto {
  @ApiProperty({ description: 'Track ID' })
  @IsString()
  trackId!: string;

  @ApiProperty({ description: 'Artist ID (optional, for diversity calculation)', required: false })
  @IsOptional()
  @IsString()
  artistId?: string;
}

export class DailyMixConfigDto {
  @ApiProperty({ description: 'Maximum tracks', required: false, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxTracks?: number;

  @ApiProperty({ description: 'Minimum score threshold', required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minScore?: number;

  @ApiProperty({ description: 'Freshness ratio (0-1)', required: false, default: 0.2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  freshnessRatio?: number;
}

export enum SmartPlaylistSortDto {
  SCORE = 'score',
  POPULARITY = 'popularity',
  RECENT = 'recent',
  RANDOM = 'random',
}

export class SmartPlaylistConfigDto {
  @ApiProperty({ description: 'Playlist name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Playlist description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Filter by artist ID', required: false })
  @IsOptional()
  @IsString()
  artistId?: string;

  @ApiProperty({ description: 'Filter by genre ID', required: false })
  @IsOptional()
  @IsString()
  genreId?: string;

  @ApiProperty({ description: 'Minimum score', required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minScore?: number;

  @ApiProperty({ description: 'Maximum tracks', required: false, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  maxTracks?: number;

  @ApiProperty({ enum: SmartPlaylistSortDto, description: 'Sort method', required: false, default: 'score' })
  @IsOptional()
  @IsEnum(SmartPlaylistSortDto)
  sortBy?: SmartPlaylistSortDto;
}
