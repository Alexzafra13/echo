import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for image metadata in responses
 */
export class ImageMetadataDto {
  @ApiProperty({
    description: 'Whether the image exists',
    example: true,
  })
  exists: boolean;

  @ApiProperty({
    description: 'Size of the image in bytes',
    example: 1024000,
    required: false,
  })
  size?: number;

  @ApiProperty({
    description: 'MIME type of the image',
    example: 'image/png',
    required: false,
  })
  mimeType?: string;

  @ApiProperty({
    description: 'Last modified timestamp',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  lastModified?: string;
}

/**
 * DTO for all artist images response
 */
export class ArtistImagesDto {
  @ApiProperty({
    description: 'Artist UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  artistId: string;

  @ApiProperty({
    description: 'Available images for the artist',
    type: 'object',
  })
  images: {
    profileSmall?: ImageMetadataDto;
    profileMedium?: ImageMetadataDto;
    profileLarge?: ImageMetadataDto;
    background?: ImageMetadataDto;
    banner?: ImageMetadataDto;
    logo?: ImageMetadataDto;
  };
}
