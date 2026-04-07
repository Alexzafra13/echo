import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para buscar emisoras de radio
 */
export class SearchStationsDto {
  @ApiPropertyOptional({ description: 'Filter by station name', example: 'Jazz' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by country name', example: 'United States' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Filter by ISO country code', example: 'US' })
  @IsOptional()
  @IsString()
  countrycode?: string;

  @ApiPropertyOptional({ description: 'Filter by tag', example: 'rock' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Filter by broadcast language', example: 'english' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Filter by audio codec', example: 'MP3' })
  @IsOptional()
  @IsString()
  codec?: string;

  @ApiPropertyOptional({ description: 'Minimum bitrate in kbps', example: 64 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bitrateMin?: number;

  @ApiPropertyOptional({ description: 'Maximum bitrate in kbps', example: 320 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bitrateMax?: number;

  @ApiPropertyOptional({
    description: 'Field to order results by',
    example: 'name',
    enum: [
      'name',
      'url',
      'homepage',
      'favicon',
      'tags',
      'country',
      'state',
      'language',
      'votes',
      'codec',
      'bitrate',
      'lastcheckok',
      'lastchecktime',
      'clicktimestamp',
      'clickcount',
      'clicktrend',
      'changetimestamp',
      'random',
    ],
  })
  @IsOptional()
  @IsString()
  order?:
    | 'name'
    | 'url'
    | 'homepage'
    | 'favicon'
    | 'tags'
    | 'country'
    | 'state'
    | 'language'
    | 'votes'
    | 'codec'
    | 'bitrate'
    | 'lastcheckok'
    | 'lastchecktime'
    | 'clicktimestamp'
    | 'clickcount'
    | 'clicktrend'
    | 'changetimestamp'
    | 'random';

  @ApiPropertyOptional({ description: 'Reverse the order of results', example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  reverse?: boolean;

  @ApiPropertyOptional({ description: 'Number of results to skip', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: 'Maximum number of results to return', example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10000)
  limit?: number;

  @ApiPropertyOptional({ description: 'Hide broken stations from results', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hidebroken?: boolean;

  @ApiPropertyOptional({ description: 'Remove duplicate stations from results', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  removeDuplicates?: boolean;
}
