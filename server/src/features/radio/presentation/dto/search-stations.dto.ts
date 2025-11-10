import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para buscar emisoras de radio
 */
export class SearchStationsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  countrycode?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  codec?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bitrateMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bitrateMax?: number;

  @IsOptional()
  @IsString()
  order?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  reverse?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hidebroken?: boolean;
}
