import { IsUUID } from 'class-validator';

export class SearchAlbumCoversRequestDto {
  @IsUUID()
  albumId!: string;
}
