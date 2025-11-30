import { Expose } from 'class-transformer';
import { UpdatePrivacySettingsOutput } from '../../domain/use-cases/update-privacy-settings';

export class PrivacySettingsResponseDto {
  @Expose()
  isPublicProfile!: boolean;

  @Expose()
  showTopTracks!: boolean;

  @Expose()
  showTopArtists!: boolean;

  @Expose()
  showTopAlbums!: boolean;

  @Expose()
  showPlaylists!: boolean;

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
