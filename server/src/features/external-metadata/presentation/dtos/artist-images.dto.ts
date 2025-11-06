import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for image metadata in responses
 */
export interface ImageMetadataDto {
  exists: boolean;
  size?: number;
  mimeType?: string;
  lastModified?: string;
}

/**
 * DTO for all artist images response
 */
export interface ArtistImagesDto {
  artistId: string;
  images: {
    profileSmall?: ImageMetadataDto;
    profileMedium?: ImageMetadataDto;
    profileLarge?: ImageMetadataDto;
    background?: ImageMetadataDto;
    banner?: ImageMetadataDto;
    logo?: ImageMetadataDto;
  };
}
