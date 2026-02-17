import { ValidationError } from '@shared/errors';

export type ArtistImageType = 'profile' | 'background' | 'banner' | 'logo';

// Mapeo de tipo de imagen a campos de base de datos
export interface ArtistImageTypeConfig {
  filename: string;
  localPathField: string;
  localUpdatedField: string;
  externalPathField: string;
  externalSourceField: string;
  externalUpdatedField: string;
}

export interface ArtistImageTypeFullConfig extends ArtistImageTypeConfig {
  oldPathField: string;
}

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

export function getArtistImageTypeConfig(type: string): ArtistImageTypeFullConfig {
  const config = ARTIST_IMAGE_TYPE_CONFIGS[type as ArtistImageType];

  if (!config) {
    throw new ValidationError(`Invalid image type: ${type}`);
  }

  return config;
}

// Retorna config de profile como fallback para tipos desconocidos
export function getArtistImageTypeBasicConfig(type: string): ArtistImageTypeConfig {
  const config = ARTIST_IMAGE_TYPE_CONFIGS[type as ArtistImageType];

  if (!config) {
    return ARTIST_IMAGE_TYPE_CONFIGS.profile;
  }

  return config;
}

export function isValidArtistImageType(type: string): type is ArtistImageType {
  return type in ARTIST_IMAGE_TYPE_CONFIGS;
}

export function getValidArtistImageTypes(): ArtistImageType[] {
  return Object.keys(ARTIST_IMAGE_TYPE_CONFIGS) as ArtistImageType[];
}
