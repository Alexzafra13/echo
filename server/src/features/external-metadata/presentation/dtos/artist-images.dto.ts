import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for image metadata in responses (V2 with tag and source)
 */
export interface ImageMetadataDto {
  exists: boolean;
  size?: number;
  mimeType?: string;
  lastModified?: string;
  tag?: string;           // MD5 hash for cache-busting
  source?: 'local' | 'external';  // Image source
}

/**
 * DTO for all artist images response (V2 with unified profile)
 */
export interface ArtistImagesDto {
  artistId: string;
  images: {
    profile?: ImageMetadataDto;     // Unified profile image (replaces small/medium/large)
    background?: ImageMetadataDto;
    banner?: ImageMetadataDto;
    logo?: ImageMetadataDto;
  };
}
