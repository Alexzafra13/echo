import { IsUUID } from 'class-validator';

export class SearchArtistAvatarsRequestDto {
  @IsUUID()
  artistId!: string;
}
