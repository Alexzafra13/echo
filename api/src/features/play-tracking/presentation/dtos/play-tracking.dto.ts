import { IsString, IsEnum, IsNumber, IsOptional, Min, Max, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PlayContextDto {
  DIRECT = 'direct',
  ALBUM = 'album',
  PLAYLIST = 'playlist',
  ARTIST = 'artist',
  SHUFFLE = 'shuffle',
  RADIO = 'radio',
  RECOMMENDATION = 'recommendation',
  SEARCH = 'search',
  QUEUE = 'queue',
}

export enum SourceTypeDto {
  ALBUM = 'album',
  PLAYLIST = 'playlist',
  ARTIST = 'artist',
  RADIO = 'radio',
  SEARCH = 'search',
  RECOMMENDATION = 'recommendation',
}

export class RecordPlayDto {
  @ApiProperty({ description: 'Track ID' })
  @IsString()
  trackId!: string;

  @ApiProperty({ enum: PlayContextDto, description: 'Play context' })
  @IsEnum(PlayContextDto)
  playContext!: PlayContextDto;

  @ApiProperty({
    description: 'Completion rate (0.0 - 1.0)',
    required: false,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  completionRate?: number;

  @ApiProperty({ description: 'Source ID (album/playlist/artist ID)', required: false })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiProperty({ enum: SourceTypeDto, description: 'Source type', required: false })
  @IsOptional()
  @IsEnum(SourceTypeDto)
  sourceType?: SourceTypeDto;
}

export class RecordSkipDto {
  @ApiProperty({ description: 'Track ID' })
  @IsString()
  trackId!: string;

  @ApiProperty({ description: 'Completion rate when skipped (0.0 - 1.0)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  completionRate!: number;

  @ApiProperty({ enum: PlayContextDto, description: 'Play context' })
  @IsEnum(PlayContextDto)
  playContext!: PlayContextDto;
}

export class FederationTrackDto {
  @ApiProperty({ description: 'Track title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Artist name' })
  @IsString()
  artistName!: string;

  @ApiProperty({ description: 'Album name' })
  @IsString()
  albumName!: string;

  @ApiProperty({ description: 'Cover image URL', required: false })
  @IsOptional()
  @IsString()
  coverUrl?: string | null;

  @ApiProperty({ description: 'Federation server ID' })
  @IsString()
  serverId!: string;

  @ApiProperty({ description: 'Federation server name', required: false })
  @IsOptional()
  @IsString()
  serverName?: string;
}

/**
 * DTO for updating playback state (for social "listening now" feature)
 */
export class UpdatePlaybackStateDto {
  @ApiProperty({ description: 'Whether the user is currently playing', example: true })
  @IsOptional()
  isPlaying?: boolean;

  @ApiProperty({
    description: 'Current track ID being played',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  currentTrackId?: string | null;

  @ApiProperty({
    description: 'Federation track info (when playing from a federated server)',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FederationTrackDto)
  federationTrack?: FederationTrackDto | null;
}
