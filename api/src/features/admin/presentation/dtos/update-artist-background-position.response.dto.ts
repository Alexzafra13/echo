import { ApiProperty } from '@nestjs/swagger';
import { UpdateArtistBackgroundPositionOutput } from '@features/admin/infrastructure/use-cases/update-artist-background-position';

export class UpdateArtistBackgroundPositionResponseDto {
  @ApiProperty({
    description: 'Whether the background position was updated successfully',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Human-readable result message',
    example: 'Background position updated successfully',
  })
  message!: string;

  static fromDomain(
    output: UpdateArtistBackgroundPositionOutput
  ): UpdateArtistBackgroundPositionResponseDto {
    const dto = new UpdateArtistBackgroundPositionResponseDto();
    dto.success = output.success;
    dto.message = output.message;
    return dto;
  }
}
