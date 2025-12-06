import { BadRequestException } from '@nestjs/common';

/**
 * Types of artist images supported by the system
 */
export type ArtistImageType = 'profile' | 'background' | 'banner' | 'logo';

/**
 * Configuration for artist image type fields
 * Maps each image type to its corresponding database fields
 */
export interface ArtistImageTypeConfig {
  /** Filename used when downloading external images */
  filename: string;
  /** Database field for local (custom uploaded) image path */
  localPathField: string;
  /** Database field for local image update timestamp */
  localUpdatedField: string;
  /** Database field for external (provider) image path */
  externalPathField: string;
  /** Database field for external image provider source */
  externalSourceField: string;
  /** Database field for external image update timestamp */
  externalUpdatedField: string;
}

/**
 * Full configuration including legacy field references
 * Used when applying external provider images
 */
export interface ArtistImageTypeFullConfig extends ArtistImageTypeConfig {
  /** Field pointing to old external path (for deletion) */
  oldPathField: string;
}

/**
 * Configuration map for all artist image types
 */
const ARTIST_IMAGE_TYPE_CONFIGS: Record<ArtistImageType, ArtistImageTypeFullConfig> = {
  profile: {
    filename: 'profile.jpg',
    localPathField: 'profileImagePath',
    localUpdatedField: 'profileImageUpdatedAt',
    externalPathField: 'externalProfilePath',
    externalSourceField: 'externalProfileSource',
    externalUpdatedField: 'externalProfileUpdatedAt',
    oldPathField: 'externalProfilePath',
  },
  background: {
    filename: 'background.jpg',
    localPathField: 'backgroundImagePath',
    localUpdatedField: 'backgroundUpdatedAt',
    externalPathField: 'externalBackgroundPath',
    externalSourceField: 'externalBackgroundSource',
    externalUpdatedField: 'externalBackgroundUpdatedAt',
    oldPathField: 'externalBackgroundPath',
  },
  banner: {
    filename: 'banner.png',
    localPathField: 'bannerImagePath',
    localUpdatedField: 'bannerUpdatedAt',
    externalPathField: 'externalBannerPath',
    externalSourceField: 'externalBannerSource',
    externalUpdatedField: 'externalBannerUpdatedAt',
    oldPathField: 'externalBannerPath',
  },
  logo: {
    filename: 'logo.png',
    localPathField: 'logoImagePath',
    localUpdatedField: 'logoUpdatedAt',
    externalPathField: 'externalLogoPath',
    externalSourceField: 'externalLogoSource',
    externalUpdatedField: 'externalLogoUpdatedAt',
    oldPathField: 'externalLogoPath',
  },
};

/**
 * Get full configuration for an artist image type
 * Throws BadRequestException if type is invalid
 *
 * @param type - The image type (profile, background, banner, logo)
 * @returns Full configuration including all field mappings
 */
export function getArtistImageTypeConfig(type: string): ArtistImageTypeFullConfig {
  const config = ARTIST_IMAGE_TYPE_CONFIGS[type as ArtistImageType];

  if (!config) {
    throw new BadRequestException(`Invalid image type: ${type}`);
  }

  return config;
}

/**
 * Get basic configuration (without filename and oldPathField) for an artist image type
 * Returns profile config as fallback for unknown types (legacy behavior)
 *
 * @param type - The image type (profile, background, banner, logo)
 * @returns Basic configuration for field mappings
 */
export function getArtistImageTypeBasicConfig(type: string): ArtistImageTypeConfig {
  const config = ARTIST_IMAGE_TYPE_CONFIGS[type as ArtistImageType];

  if (!config) {
    return ARTIST_IMAGE_TYPE_CONFIGS.profile;
  }

  return config;
}

/**
 * Check if a string is a valid artist image type
 */
export function isValidArtistImageType(type: string): type is ArtistImageType {
  return type in ARTIST_IMAGE_TYPE_CONFIGS;
}

/**
 * Get all valid artist image types
 */
export function getValidArtistImageTypes(): ArtistImageType[] {
  return Object.keys(ARTIST_IMAGE_TYPE_CONFIGS) as ArtistImageType[];
}
