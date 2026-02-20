import { BadRequestException } from '@nestjs/common';
import {
  validateFileUpload,
  generateUniqueFilename,
  normalizePathSeparators,
  getExtensionFromMimeType,
  FILE_UPLOAD_CONFIGS,
  MIME_TO_EXTENSION,
} from './file-upload.util';

describe('file-upload.util', () => {
  describe('validateFileUpload', () => {
    it('should throw BadRequestException when file is null', () => {
      expect(() => validateFileUpload(null)).toThrow(BadRequestException);
      expect(() => validateFileUpload(null)).toThrow('No file provided');
    });

    it('should throw BadRequestException when file is undefined', () => {
      expect(() => validateFileUpload(undefined)).toThrow(BadRequestException);
      expect(() => validateFileUpload(undefined)).toThrow('No file provided');
    });

    it('should throw BadRequestException for invalid mime type', () => {
      const file = { mimetype: 'application/pdf', size: 1024 };
      expect(() => validateFileUpload(file)).toThrow(BadRequestException);
      expect(() => validateFileUpload(file)).toThrow('Invalid file type');
    });

    it('should throw BadRequestException when file size exceeds limit', () => {
      const file = { mimetype: 'image/jpeg', size: 11 * 1024 * 1024 }; // 11MB
      expect(() => validateFileUpload(file)).toThrow(BadRequestException);
      expect(() => validateFileUpload(file)).toThrow('File size exceeds');
    });

    it('should not throw for valid file with default config', () => {
      const file = { mimetype: 'image/jpeg', size: 5 * 1024 * 1024 }; // 5MB
      expect(() => validateFileUpload(file)).not.toThrow();
    });

    it('should not throw for valid file with image/png', () => {
      const file = { mimetype: 'image/png', size: 1024 };
      expect(() => validateFileUpload(file)).not.toThrow();
    });

    it('should not throw for valid file with image/webp', () => {
      const file = { mimetype: 'image/webp', size: 1024 };
      expect(() => validateFileUpload(file)).not.toThrow();
    });

    it('should validate against avatar config', () => {
      const file = { mimetype: 'image/jpeg', size: 6 * 1024 * 1024 }; // 6MB
      expect(() => validateFileUpload(file, FILE_UPLOAD_CONFIGS.avatar)).toThrow(BadRequestException);
      expect(() => validateFileUpload(file, FILE_UPLOAD_CONFIGS.avatar)).toThrow('File size exceeds 5MB limit');
    });

    it('should accept file at exact size limit', () => {
      const file = { mimetype: 'image/jpeg', size: 10 * 1024 * 1024 }; // exactly 10MB
      expect(() => validateFileUpload(file)).not.toThrow();
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate filename with correct format', () => {
      const result = generateUniqueFilename('photo.jpg', 'avatar');
      expect(result).toMatch(/^avatar_\d+_[a-f0-9]{16}\.jpg$/);
    });

    it('should preserve file extension', () => {
      const result = generateUniqueFilename('image.png', 'upload');
      expect(result).toMatch(/\.png$/);
    });

    it('should handle files without extension', () => {
      const result = generateUniqueFilename('filename', 'prefix');
      expect(result).toMatch(/^prefix_\d+_[a-f0-9]{16}$/);
    });

    it('should handle multiple dots in filename', () => {
      const result = generateUniqueFilename('my.photo.file.webp', 'test');
      expect(result).toMatch(/\.webp$/);
    });

    it('should generate unique filenames for same input', () => {
      const result1 = generateUniqueFilename('photo.jpg', 'avatar');
      const result2 = generateUniqueFilename('photo.jpg', 'avatar');
      expect(result1).not.toBe(result2);
    });

    it('should include timestamp in filename', () => {
      const beforeTime = Date.now();
      const result = generateUniqueFilename('photo.jpg', 'avatar');
      const afterTime = Date.now();

      const timestampMatch = result.match(/avatar_(\d+)_/);
      expect(timestampMatch).toBeTruthy();
      const timestamp = parseInt(timestampMatch![1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('normalizePathSeparators', () => {
    it('should convert backslashes to forward slashes', () => {
      const result = normalizePathSeparators('path\\to\\file.jpg');
      expect(result).toBe('path/to/file.jpg');
    });

    it('should handle multiple backslashes', () => {
      const result = normalizePathSeparators('C:\\Users\\Name\\Documents\\file.txt');
      expect(result).toBe('C:/Users/Name/Documents/file.txt');
    });

    it('should not modify paths with forward slashes', () => {
      const result = normalizePathSeparators('path/to/file.jpg');
      expect(result).toBe('path/to/file.jpg');
    });

    it('should handle mixed separators', () => {
      const result = normalizePathSeparators('path\\to/file\\image.png');
      expect(result).toBe('path/to/file/image.png');
    });

    it('should handle empty string', () => {
      const result = normalizePathSeparators('');
      expect(result).toBe('');
    });
  });

  describe('getExtensionFromMimeType', () => {
    it('should return jpg for image/jpeg', () => {
      expect(getExtensionFromMimeType('image/jpeg')).toBe('jpg');
    });

    it('should return jpg for image/jpg', () => {
      expect(getExtensionFromMimeType('image/jpg')).toBe('jpg');
    });

    it('should return png for image/png', () => {
      expect(getExtensionFromMimeType('image/png')).toBe('png');
    });

    it('should return webp for image/webp', () => {
      expect(getExtensionFromMimeType('image/webp')).toBe('webp');
    });

    it('should return jpg for unknown mime type', () => {
      expect(getExtensionFromMimeType('application/pdf')).toBe('jpg');
    });

    it('should return jpg for empty string', () => {
      expect(getExtensionFromMimeType('')).toBe('jpg');
    });
  });

  describe('FILE_UPLOAD_CONFIGS', () => {
    it('should have correct image config', () => {
      expect(FILE_UPLOAD_CONFIGS.image.maxSizeBytes).toBe(10 * 1024 * 1024);
      expect(FILE_UPLOAD_CONFIGS.image.allowedMimeTypes).toEqual([
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ]);
    });

    it('should have correct avatar config', () => {
      expect(FILE_UPLOAD_CONFIGS.avatar.maxSizeBytes).toBe(5 * 1024 * 1024);
      expect(FILE_UPLOAD_CONFIGS.avatar.allowedMimeTypes).toEqual([
        'image/jpeg',
        'image/png',
        'image/webp',
      ]);
    });
  });

  describe('MIME_TO_EXTENSION', () => {
    it('should contain all expected mime type mappings', () => {
      expect(MIME_TO_EXTENSION['image/jpeg']).toBe('jpg');
      expect(MIME_TO_EXTENSION['image/jpg']).toBe('jpg');
      expect(MIME_TO_EXTENSION['image/png']).toBe('png');
      expect(MIME_TO_EXTENSION['image/webp']).toBe('webp');
    });
  });
});
