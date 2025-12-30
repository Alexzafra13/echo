import { describe, it, expect } from 'vitest';
import {
  getActionText,
  getActionIcon,
  getTargetUrl,
  shouldShowCover,
  getMosaicClass,
} from '../socialFormatters';

describe('socialFormatters', () => {
  describe('getActionText', () => {
    it.each([
      ['created_playlist', 'creó la playlist'],
      ['liked_track', 'le gustó'],
      ['liked_album', 'le gustó el álbum'],
      ['liked_artist', 'le gustó el artista'],
      ['played_track', 'escuchó'],
      ['became_friends', 'ahora es amigo de'],
    ])('should return correct text for %s', (actionType, expected) => {
      expect(getActionText(actionType)).toBe(expected);
    });

    it('should return the action type itself for unknown types', () => {
      expect(getActionText('unknown_action')).toBe('unknown_action');
    });
  });

  describe('getActionIcon', () => {
    it.each([
      ['created_playlist', '📋'],
      ['liked_track', '❤️'],
      ['liked_album', '❤️'],
      ['liked_artist', '❤️'],
      ['played_track', '🎵'],
      ['became_friends', '🤝'],
    ])('should return correct icon for %s', (actionType, expected) => {
      expect(getActionIcon(actionType)).toBe(expected);
    });

    it('should return bullet for unknown types', () => {
      expect(getActionIcon('unknown_action')).toBe('•');
    });
  });

  describe('getTargetUrl', () => {
    it('should return playlist URL', () => {
      expect(getTargetUrl('playlist', '123')).toBe('/playlists/123');
    });

    it('should return album URL', () => {
      expect(getTargetUrl('album', '456')).toBe('/album/456');
    });

    it('should return artist URL', () => {
      expect(getTargetUrl('artist', '789')).toBe('/artists/789');
    });

    it('should return album URL for track when albumId provided', () => {
      expect(getTargetUrl('track', '111', '222')).toBe('/album/222');
    });

    it('should return null for track without albumId', () => {
      expect(getTargetUrl('track', '111')).toBeNull();
    });

    it('should return null for unknown target type', () => {
      expect(getTargetUrl('unknown', '123')).toBeNull();
    });
  });

  describe('shouldShowCover', () => {
    it('should return false for became_friends', () => {
      expect(shouldShowCover('became_friends')).toBe(false);
    });

    it.each([
      'created_playlist',
      'liked_track',
      'liked_album',
      'liked_artist',
      'played_track',
    ])('should return true for %s', (actionType) => {
      expect(shouldShowCover(actionType)).toBe(true);
    });
  });

  describe('getMosaicClass', () => {
    it.each([
      [1, 'single'],
      [2, '2'],
      [3, '3'],
      [4, '4'],
      [5, '4'],
      [10, '4'],
    ])('should return correct class for count %i', (count, expected) => {
      expect(getMosaicClass(count)).toBe(expected);
    });
  });
});
