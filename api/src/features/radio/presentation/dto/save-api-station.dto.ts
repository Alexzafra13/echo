import { IsNotEmpty, IsString, IsUrl, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para guardar una emisora desde Radio Browser API
 */
export class SaveApiStationDto {
  @ApiProperty({
    description: 'UUID of the station from Radio Browser API',
    example: '96202c52-e145-4c78-87c0-a1b2c3d4e5f6',
  })
  @IsNotEmpty()
  @IsString()
  stationuuid!: string;

  @ApiProperty({ description: 'Name of the radio station', example: 'Jazz FM' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Stream URL of the radio station',
    example: 'https://stream.jazzfm.com/live',
  })
  @IsNotEmpty()
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({
    description: 'Resolved stream URL after redirects',
    example: 'https://cdn.jazzfm.com/live.mp3',
  })
  @IsOptional()
  @IsUrl()
  url_resolved?: string;

  @ApiPropertyOptional({
    description: 'Homepage URL of the radio station',
    example: 'https://jazzfm.com',
  })
  @IsOptional()
  @IsUrl()
  homepage?: string;

  @ApiPropertyOptional({
    description: 'URL of the station favicon or logo',
    example: 'https://jazzfm.com/favicon.ico',
  })
  @IsOptional()
  @IsUrl()
  favicon?: string;

  @ApiPropertyOptional({
    description: 'Country where the station is based',
    example: 'United Kingdom',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'ISO country code', example: 'GB' })
  @IsOptional()
  @IsString()
  countrycode?: string;

  @ApiPropertyOptional({ description: 'State or region of the station', example: 'London' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Language of the station broadcast', example: 'english' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated tags for the station',
    example: 'jazz,smooth,instrumental',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: 'Audio codec used by the stream', example: 'MP3' })
  @IsOptional()
  @IsString()
  codec?: string;

  @ApiPropertyOptional({ description: 'Bitrate of the stream in kbps', example: 128 })
  @IsOptional()
  @IsNumber()
  bitrate?: number;

  @ApiPropertyOptional({ description: 'Number of votes from Radio Browser', example: 42 })
  @IsOptional()
  @IsNumber()
  votes?: number;

  @ApiPropertyOptional({ description: 'Total click count', example: 1500 })
  @IsOptional()
  @IsNumber()
  clickcount?: number;

  @ApiPropertyOptional({ description: 'Whether the last health check passed', example: true })
  @IsOptional()
  @IsBoolean()
  lastcheckok?: boolean;
}
