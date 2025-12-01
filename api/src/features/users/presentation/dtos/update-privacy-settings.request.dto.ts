import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePrivacySettingsRequestDto {
  @ApiPropertyOptional({
    description: 'Si el perfil es público',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublicProfile?: boolean;

  @ApiPropertyOptional({
    description: 'Mostrar top canciones en el perfil público',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showTopTracks?: boolean;

  @ApiPropertyOptional({
    description: 'Mostrar top artistas en el perfil público',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showTopArtists?: boolean;

  @ApiPropertyOptional({
    description: 'Mostrar top álbumes en el perfil público',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showTopAlbums?: boolean;

  @ApiPropertyOptional({
    description: 'Mostrar playlists públicas en el perfil',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showPlaylists?: boolean;

  @ApiPropertyOptional({
    description: 'Biografía del usuario',
    example: 'Amante de la música indie y el jazz',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string | null;
}
