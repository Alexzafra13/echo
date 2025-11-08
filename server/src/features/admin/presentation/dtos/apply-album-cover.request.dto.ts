import { IsUUID, IsString, IsUrl } from 'class-validator';

export class ApplyAlbumCoverRequestDto {
  @IsUUID()
  albumId!: string;

  @IsUrl()
  coverUrl!: string;

  @IsString()
  provider!: string;
}
