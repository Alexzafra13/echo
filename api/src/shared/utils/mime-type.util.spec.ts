import {
  getMimeType,
  getAudioMimeType,
  getImageMimeType,
  AUDIO_MIME_TYPES,
  IMAGE_MIME_TYPES,
} from './mime-type.util';

describe('MIME Type Utils', () => {
  describe('getMimeType', () => {
    it('should return correct MIME for common audio extensions', () => {
      expect(getMimeType('.mp3')).toBe('audio/mpeg');
      expect(getMimeType('.flac')).toBe('audio/flac');
      expect(getMimeType('.ogg')).toBe('audio/ogg');
      expect(getMimeType('.m4a')).toBe('audio/mp4');
      expect(getMimeType('.wav')).toBe('audio/wav');
      expect(getMimeType('.opus')).toBe('audio/opus');
    });

    it('should return correct MIME for image extensions', () => {
      expect(getMimeType('.jpg')).toBe('image/jpeg');
      expect(getMimeType('.jpeg')).toBe('image/jpeg');
      expect(getMimeType('.png')).toBe('image/png');
      expect(getMimeType('.webp')).toBe('image/webp');
    });

    it('should work without leading dot', () => {
      expect(getMimeType('mp3')).toBe('audio/mpeg');
      expect(getMimeType('jpg')).toBe('image/jpeg');
    });

    it('should be case insensitive', () => {
      expect(getMimeType('.MP3')).toBe('audio/mpeg');
      expect(getMimeType('.FLAC')).toBe('audio/flac');
      expect(getMimeType('.JPG')).toBe('image/jpeg');
    });

    it('should return default for unknown extension', () => {
      expect(getMimeType('.xyz')).toBe('application/octet-stream');
    });

    it('should accept custom default type', () => {
      expect(getMimeType('.xyz', 'text/plain')).toBe('text/plain');
    });
  });

  describe('getAudioMimeType', () => {
    it('should return correct audio MIME types', () => {
      expect(getAudioMimeType('.mp3')).toBe('audio/mpeg');
      expect(getAudioMimeType('.flac')).toBe('audio/flac');
    });

    it('should return audio/mpeg as default for unknown', () => {
      expect(getAudioMimeType('.xyz')).toBe('audio/mpeg');
    });

    it('should work without leading dot', () => {
      expect(getAudioMimeType('flac')).toBe('audio/flac');
    });
  });

  describe('getImageMimeType', () => {
    it('should return correct image MIME types', () => {
      expect(getImageMimeType('.png')).toBe('image/png');
      expect(getImageMimeType('.webp')).toBe('image/webp');
    });

    it('should return image/jpeg as default for unknown', () => {
      expect(getImageMimeType('.xyz')).toBe('image/jpeg');
    });

    it('should work without leading dot', () => {
      expect(getImageMimeType('png')).toBe('image/png');
    });
  });

  describe('constants', () => {
    it('AUDIO_MIME_TYPES should include all standard formats', () => {
      expect(Object.keys(AUDIO_MIME_TYPES)).toContain('.mp3');
      expect(Object.keys(AUDIO_MIME_TYPES)).toContain('.flac');
      expect(Object.keys(AUDIO_MIME_TYPES)).toContain('.ogg');
      expect(Object.keys(AUDIO_MIME_TYPES)).toContain('.m4a');
      expect(Object.keys(AUDIO_MIME_TYPES)).toContain('.wav');
    });

    it('IMAGE_MIME_TYPES should include standard formats', () => {
      expect(Object.keys(IMAGE_MIME_TYPES)).toContain('.jpg');
      expect(Object.keys(IMAGE_MIME_TYPES)).toContain('.png');
      expect(Object.keys(IMAGE_MIME_TYPES)).toContain('.webp');
    });
  });
});
