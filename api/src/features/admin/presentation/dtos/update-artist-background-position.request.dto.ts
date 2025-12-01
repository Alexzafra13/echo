import { IsUUID, IsString } from 'class-validator';

export class UpdateArtistBackgroundPositionRequestDto {
  @IsUUID()
  artistId!: string;

  @IsString()
  backgroundPosition!: string; // CSS background-position value (e.g., "center 25%")
}
