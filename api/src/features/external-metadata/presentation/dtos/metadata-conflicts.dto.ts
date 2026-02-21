import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Entity types that can have metadata conflicts
 */
export enum EntityTypeDto {
  TRACK = 'track',
  ALBUM = 'album',
  ARTIST = 'artist',
}

/**
 * Conflict resolution status
 */
export enum ConflictStatusDto {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  IGNORED = 'ignored',
}

/**
 * External metadata sources
 */
export enum ConflictSourceDto {
  MUSICBRAINZ = 'musicbrainz',
  LASTFM = 'lastfm',
  FANART = 'fanart',
  COVERARTARCHIVE = 'coverartarchive',
}

/**
 * DTO for querying conflicts with filters
 */
export class GetConflictsQueryDto {
  @ApiPropertyOptional({ description: 'Number of items to skip', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ description: 'Number of items to return', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 20;

  @ApiPropertyOptional({ enum: EntityTypeDto, description: 'Filter by entity type' })
  @IsOptional()
  @IsEnum(EntityTypeDto)
  entityType?: EntityTypeDto;

  @ApiPropertyOptional({ enum: ConflictSourceDto, description: 'Filter by source' })
  @IsOptional()
  @IsEnum(ConflictSourceDto)
  source?: ConflictSourceDto;

  @ApiPropertyOptional({ description: 'Filter by priority (1=low, 2=medium, 3=high)', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  priority?: number;
}

/**
 * DTO for resolving a conflict (accept/reject/ignore)
 */
export class ResolveConflictDto {
  @ApiPropertyOptional({ description: 'User ID who resolved the conflict' })
  @IsOptional()
  @IsString()
  userId?: string;
}

/**
 * Response DTO for a single conflict
 */
export class ConflictResponseDto {
  @ApiProperty({ description: 'Conflict ID' })
  id!: string;

  @ApiProperty({ description: 'Entity ID' })
  entityId!: string;

  @ApiProperty({ enum: EntityTypeDto, description: 'Entity type' })
  entityType!: string;

  @ApiProperty({ description: 'Field name' })
  field!: string;

  @ApiPropertyOptional({ description: 'Current value' })
  currentValue?: string;

  @ApiProperty({ description: 'Suggested value' })
  suggestedValue!: string;

  @ApiProperty({ enum: ConflictSourceDto, description: 'Source of suggestion' })
  source!: string;

  @ApiProperty({ enum: ConflictStatusDto, description: 'Resolution status' })
  status!: string;

  @ApiProperty({ description: 'Priority level', example: 3 })
  priority!: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'Resolution date' })
  resolvedAt?: Date;

  @ApiPropertyOptional({ description: 'User who resolved' })
  resolvedBy?: string;

  @ApiPropertyOptional({ description: 'Entity details' })
  entity?: {
    name: string;
    [key: string]: unknown;
  };
}

/**
 * Response DTO for paginated conflicts list
 */
export class ConflictsListResponseDto {
  @ApiProperty({ type: [ConflictResponseDto], description: 'List of conflicts' })
  conflicts!: ConflictResponseDto[];

  @ApiProperty({ description: 'Total number of conflicts', example: 42 })
  total!: number;

  @ApiProperty({ description: 'Number of items skipped', example: 0 })
  skip!: number;

  @ApiProperty({ description: 'Number of items returned', example: 20 })
  take!: number;
}

/**
 * Response DTO for conflict resolution
 */
export class ConflictResolvedResponseDto {
  @ApiProperty({ description: 'Conflict ID' })
  id!: string;

  @ApiProperty({ description: 'New status after resolution' })
  status!: string;

  @ApiProperty({ description: 'Success message' })
  message!: string;

  @ApiPropertyOptional({ description: 'Updated entity (if accepted)' })
  updatedEntity?: Record<string, unknown>;
}
