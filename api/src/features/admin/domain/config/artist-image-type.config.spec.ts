import { ValidationError } from '@shared/errors';
import {
  getArtistImageTypeConfig,
  getArtistImageTypeBasicConfig,
  isValidArtistImageType,
  getValidArtistImageTypes,
  ArtistImageType,
} from './artist-image-type.config';

describe('artist-image-type.config', () => {
  describe('getArtistImageTypeConfig', () => {
    it('should return correct config for profile type', () => {
      const config = getArtistImageTypeConfig('profile');

      expect(config.filename).toBe('profile.jpg');
      expect(config.localPathField).toBe('profileImagePath');
      expect(config.externalPathField).toBe('externalProfilePath');
      expect(config.externalSourceField).toBe('externalProfileSource');
      expect(config.externalUpdatedField).toBe('externalProfileUpdatedAt');
    });

    it('should return correct config for background type', () => {
      const config = getArtistImageTypeConfig('background');

      expect(config.filename).toBe('background.jpg');
      expect(config.localPathField).toBe('backgroundImagePath');
      expect(config.externalPathField).toBe('externalBackgroundPath');
    });

    it('should return correct config for banner type', () => {
      const config = getArtistImageTypeConfig('banner');

      expect(config.filename).toBe('banner.png');
      expect(config.localPathField).toBe('bannerImagePath');
      expect(config.externalPathField).toBe('externalBannerPath');
    });

    it('should return correct config for logo type', () => {
      const config = getArtistImageTypeConfig('logo');

      expect(config.filename).toBe('logo.png');
      expect(config.localPathField).toBe('logoImagePath');
      expect(config.externalPathField).toBe('externalLogoPath');
    });

    it('should throw ValidationError for invalid type', () => {
      expect(() => getArtistImageTypeConfig('invalid')).toThrow(ValidationError);
      expect(() => getArtistImageTypeConfig('invalid')).toThrow('Invalid image type: invalid');
    });

    it('should throw for empty string', () => {
      expect(() => getArtistImageTypeConfig('')).toThrow(ValidationError);
    });
  });

  describe('getArtistImageTypeBasicConfig', () => {
    it('should return config for valid types', () => {
      const profileConfig = getArtistImageTypeBasicConfig('profile');
      expect(profileConfig.localPathField).toBe('profileImagePath');

      const bgConfig = getArtistImageTypeBasicConfig('background');
      expect(bgConfig.localPathField).toBe('backgroundImagePath');
    });

    it('should return profile config as fallback for invalid types', () => {
      const config = getArtistImageTypeBasicConfig('invalid');

      expect(config.localPathField).toBe('profileImagePath');
      expect(config.externalPathField).toBe('externalProfilePath');
    });

    it('should return profile config for empty string', () => {
      const config = getArtistImageTypeBasicConfig('');

      expect(config.localPathField).toBe('profileImagePath');
    });
  });

  describe('isValidArtistImageType', () => {
    it('should return true for valid types', () => {
      expect(isValidArtistImageType('profile')).toBe(true);
      expect(isValidArtistImageType('background')).toBe(true);
      expect(isValidArtistImageType('banner')).toBe(true);
      expect(isValidArtistImageType('logo')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(isValidArtistImageType('invalid')).toBe(false);
      expect(isValidArtistImageType('')).toBe(false);
      expect(isValidArtistImageType('PROFILE')).toBe(false); // case sensitive
      expect(isValidArtistImageType('avatar')).toBe(false);
    });
  });

  describe('getValidArtistImageTypes', () => {
    it('should return all four valid types', () => {
      const types = getValidArtistImageTypes();

      expect(types).toHaveLength(4);
      expect(types).toContain('profile');
      expect(types).toContain('background');
      expect(types).toContain('banner');
      expect(types).toContain('logo');
    });

    it('should return types as ArtistImageType array', () => {
      const types = getValidArtistImageTypes();

      types.forEach((type) => {
        expect(isValidArtistImageType(type)).toBe(true);
      });
    });
  });
});
