import { IsUUID, IsString, IsUrl, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyArtistAvatarRequestDto {
  @ApiProperty({
    description: 'The UUID of the artist to apply the image to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  artistId!: string;

  @ApiProperty({
    description: 'URL of the image to download and apply',
    example: 'https://example.com/images/artist-photo.jpg',
  })
  @IsUrl()
  avatarUrl!: string;

  @ApiProperty({
    description: 'Name of the provider/source of the image',
    example: 'spotify',
  })
  @IsString()
  provider!: string;

  @ApiProperty({
    description: 'Type of artist image',
    enum: ['profile', 'background', 'banner', 'logo'],
    example: 'profile',
  })
  @IsIn(['profile', 'background', 'banner', 'logo'])
  type!: 'profile' | 'background' | 'banner' | 'logo';
}
