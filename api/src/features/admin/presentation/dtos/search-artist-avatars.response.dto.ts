import { Expose, Type } from 'class-transformer';
import { SearchArtistAvatarsOutput } from '../../infrastructure/use-cases/search-artist-avatars';

export class AvatarOptionDto {
  @Expose()
  provider!: string;

  @Expose()
  url!: string;

  @Expose()
  thumbnailUrl?: string;

  @Expose()
  width?: number;

  @Expose()
  height?: number;

  @Expose()
  type?: string;
}

export class ArtistInfoDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  mbzArtistId?: string;
}

export class SearchArtistAvatarsResponseDto {
  @Expose()
  @Type(() => AvatarOptionDto)
  avatars!: AvatarOptionDto[];

  @Expose()
  @Type(() => ArtistInfoDto)
  artistInfo!: ArtistInfoDto;

  static fromDomain(data: SearchArtistAvatarsOutput): SearchArtistAvatarsResponseDto {
    const dto = new SearchArtistAvatarsResponseDto();
    dto.avatars = data.avatars.map((avatar) => {
      const avatarDto = new AvatarOptionDto();
      avatarDto.provider = avatar.provider;
      avatarDto.url = avatar.url;
      avatarDto.thumbnailUrl = avatar.thumbnailUrl;
      avatarDto.width = avatar.width;
      avatarDto.height = avatar.height;
      avatarDto.type = avatar.type;
      return avatarDto;
    });

    const infoDto = new ArtistInfoDto();
    infoDto.id = data.artistInfo.id;
    infoDto.name = data.artistInfo.name;
    infoDto.mbzArtistId = data.artistInfo.mbzArtistId;
    dto.artistInfo = infoDto;

    return dto;
  }
}
