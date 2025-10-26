import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';

export class CreatePlaylistDto {
  @ApiProperty({
    description: 'Nombre de la playlist',
    example: 'Mi Playlist Favorita',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la playlist',
    example: 'Mis canciones favoritas de rock',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL de la imagen de portada',
    example: 'https://example.com/cover.jpg',
  })
  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @ApiPropertyOptional({
    description: 'Si la playlist es pública',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  public?: boolean;
}
