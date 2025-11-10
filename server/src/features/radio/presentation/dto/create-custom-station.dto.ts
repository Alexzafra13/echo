import { IsNotEmpty, IsString, IsUrl, IsOptional, IsNumber } from 'class-validator';

/**
 * DTO para crear una emisora personalizada
 */
export class CreateCustomStationDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsUrl()
  url: string;

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
}
