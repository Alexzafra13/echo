import { IsOptional, IsEnum, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MusicVideoResponseDto {
  @ApiProperty({
    description: 'Unique music video identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'ID of the linked track, if matched',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    nullable: true,
  })
  trackId!: string | null;

  @ApiPropertyOptional({
    description: 'Title of the music video',
    example: 'Bohemian Rhapsody (Official Video)',
    nullable: true,
  })
  title!: string | null;

  @ApiPropertyOptional({ description: 'Artist name', example: 'Queen', nullable: true })
  artistName!: string | null;

  @ApiPropertyOptional({
    description: 'Duration of the video in seconds',
    example: 354,
    nullable: true,
  })
  duration!: number | null;

  @ApiPropertyOptional({ description: 'Video width in pixels', example: 1920, nullable: true })
  width!: number | null;

  @ApiPropertyOptional({ description: 'Video height in pixels', example: 1080, nullable: true })
  height!: number | null;

  @ApiPropertyOptional({ description: 'Video codec', example: 'h264', nullable: true })
  codec!: string | null;

  @ApiPropertyOptional({
    description: 'Video bit rate in bits per second',
    example: 5000000,
    nullable: true,
  })
  bitRate!: number | null;

  @ApiPropertyOptional({ description: 'File size in bytes', example: 220000000, nullable: true })
  size!: number | null;

  @ApiPropertyOptional({ description: 'File extension', example: 'mkv', nullable: true })
  suffix!: string | null;

  @ApiPropertyOptional({
    description: 'Method used to match the video to a track',
    example: 'filename',
    nullable: true,
  })
  matchMethod!: string | null;

  @ApiProperty({
    description: 'URL to stream the music video',
    example: '/api/music-videos/a1b2c3d4/stream',
  })
  streamUrl!: string;

  @ApiPropertyOptional({
    description: 'URL to the video thumbnail',
    example: '/api/music-videos/a1b2c3d4/thumbnail',
    nullable: true,
  })
  thumbnailUrl!: string | null;
}

export class LinkVideoDto {
  @ApiProperty({ description: 'Track ID to link the video to' })
  @IsUUID()
  trackId!: string;
}

export class ListVideosQueryDto {
  @ApiProperty({ description: 'Filter videos', required: false, enum: ['matched', 'unmatched'] })
  @IsOptional()
  @IsEnum(['matched', 'unmatched'])
  filter?: 'matched' | 'unmatched';

  @ApiProperty({ description: 'Max results to return', required: false, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiProperty({ description: 'Number of results to skip', required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
