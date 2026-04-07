import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UpdatePrivacySettingsOutput } from '../../domain/use-cases/update-privacy-settings';

export class PrivacySettingsResponseDto {
  @ApiProperty({
    description: 'Whether profile is publicly visible',
    example: true,
  })
  @Expose()
  isPublicProfile!: boolean;

  @ApiProperty({
    description: 'Show top tracks on public profile',
    example: true,
  })
  @Expose()
  showTopTracks!: boolean;

  @ApiProperty({
    description: 'Show top artists on public profile',
    example: true,
  })
  @Expose()
  showTopArtists!: boolean;

  @ApiProperty({
    description: 'Show top albums on public profile',
    example: true,
  })
  @Expose()
  showTopAlbums!: boolean;

  @ApiProperty({
    description: 'Show playlists on public profile',
    example: false,
  })
  @Expose()
  showPlaylists!: boolean;

  @ApiPropertyOptional({
    description: 'User biography',
    example: 'Music enthusiast and vinyl collector',
  })
  @Expose()
  bio?: string;

  static fromDomain(data: UpdatePrivacySettingsOutput): PrivacySettingsResponseDto {
    const dto = new PrivacySettingsResponseDto();
    dto.isPublicProfile = data.isPublicProfile;
    dto.showTopTracks = data.showTopTracks;
    dto.showTopArtists = data.showTopArtists;
    dto.showTopAlbums = data.showTopAlbums;
    dto.showPlaylists = data.showPlaylists;
    dto.bio = data.bio;
    return dto;
  }
}
