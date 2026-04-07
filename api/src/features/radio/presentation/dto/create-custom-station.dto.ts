import { IsNotEmpty, IsString, IsUrl, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para crear una emisora personalizada
 */
export class CreateCustomStationDto {
  @ApiProperty({ description: 'Name of the custom radio station', example: 'My Jazz Station' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Stream URL of the radio station',
    example: 'https://stream.example.com/jazz',
  })
  @IsNotEmpty()
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({
    description: 'Homepage URL of the radio station',
    example: 'https://myjazzstation.com',
  })
  @IsOptional()
  @IsUrl()
  homepage?: string;

  @ApiPropertyOptional({
    description: 'URL of the station favicon or logo',
    example: 'https://myjazzstation.com/favicon.ico',
  })
  @IsOptional()
  @IsUrl()
  favicon?: string;

  @ApiPropertyOptional({
    description: 'Country where the station is based',
    example: 'United States',
  })
  @IsOptional()
  @IsString()
  country?: string;

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
}
