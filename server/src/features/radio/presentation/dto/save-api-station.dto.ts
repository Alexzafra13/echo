import { IsNotEmpty, IsString, IsUrl, IsOptional, IsNumber, IsBoolean } from 'class-validator';

/**
 * DTO para guardar una emisora desde Radio Browser API
 */
export class SaveApiStationDto {
  @IsNotEmpty()
  @IsString()
  stationuuid!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsUrl()
  url_resolved?: string;

  @IsOptional()
  @IsUrl()
  homepage?: string;

  @IsOptional()
  @IsUrl()
  favicon?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  countrycode?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  codec?: string;

  @IsOptional()
  @IsNumber()
  bitrate?: number;

  @IsOptional()
  @IsNumber()
  votes?: number;

  @IsOptional()
  @IsNumber()
  clickcount?: number;

  @IsOptional()
  @IsBoolean()
  lastcheckok?: boolean;
}
