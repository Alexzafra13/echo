import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchArtistAvatarsRequestDto {
  @ApiProperty({
    description: 'The UUID of the artist to search avatars for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  artistId!: string;
}
