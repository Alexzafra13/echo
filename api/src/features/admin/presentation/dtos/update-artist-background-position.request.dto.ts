import { IsUUID, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateArtistBackgroundPositionRequestDto {
  @ApiProperty({
    description: 'UUID of the artist to update',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  artistId!: string;

  @ApiProperty({ description: 'CSS background-position value', example: 'center 25%' })
  @IsString()
  backgroundPosition!: string; // CSS background-position value (e.g., "center 25%")
}
