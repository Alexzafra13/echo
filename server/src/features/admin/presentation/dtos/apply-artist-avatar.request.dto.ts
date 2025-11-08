import { IsUUID, IsString, IsUrl, IsIn } from 'class-validator';

export class ApplyArtistAvatarRequestDto {
  @IsUUID()
  artistId!: string;

  @IsUrl()
  avatarUrl!: string;

  @IsString()
  provider!: string;

  @IsIn(['profile', 'background', 'banner', 'logo'])
  type!: 'profile' | 'background' | 'banner' | 'logo';
}
