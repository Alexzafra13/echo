import { UpdateArtistBackgroundPositionOutput } from '@features/admin/infrastructure/use-cases/update-artist-background-position';

export class UpdateArtistBackgroundPositionResponseDto {
  success!: boolean;
  message!: string;

  static fromDomain(
    output: UpdateArtistBackgroundPositionOutput,
  ): UpdateArtistBackgroundPositionResponseDto {
    const dto = new UpdateArtistBackgroundPositionResponseDto();
    dto.success = output.success;
    dto.message = output.message;
    return dto;
  }
}
