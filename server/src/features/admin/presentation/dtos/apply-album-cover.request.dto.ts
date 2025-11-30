import { IsUUID, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyAlbumCoverRequestDto {
  @ApiProperty({
    description: 'The UUID of the album to apply the cover to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  albumId!: string;

  @ApiProperty({
    description: 'URL of the cover image to download and apply',
    example: 'https://example.com/covers/album-cover.jpg',
  })
  @IsUrl()
  coverUrl!: string;

  @ApiProperty({
    description: 'Name of the provider/source of the cover image',
    example: 'musicbrainz',
  })
  @IsString()
  provider!: string;
}
