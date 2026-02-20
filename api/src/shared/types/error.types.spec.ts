import {
  isNodeSystemError,
  isFileNotFoundError,
  getErrorCode,
  NodeSystemError,
} from './error.types';

describe('error.types', () => {
  describe('isNodeSystemError', () => {
    it('should return false for plain Error without code', () => {
      const error = new Error('Simple error');
      expect(isNodeSystemError(error)).toBe(false);
    });

    it('should return true for Error with code property', () => {
      const error = new Error('System error') as NodeSystemError;
      error.code = 'ENOENT';
      expect(isNodeSystemError(error)).toBe(true);
    });

    it('should return false for non-Error object', () => {
      const notError = { code: 'ENOENT', message: 'Not an error' };
      expect(isNodeSystemError(notError)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isNodeSystemError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isNodeSystemError(undefined)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isNodeSystemError('error string')).toBe(false);
    });

    it('should return true for Error with code and other properties', () => {
      const error = new Error('File system error') as NodeSystemError;
      error.code = 'EACCES';
      error.errno = -13;
      error.syscall = 'open';
      error.path = '/some/path';
      expect(isNodeSystemError(error)).toBe(true);
    });
  });

  describe('isFileNotFoundError', () => {
    it('should return true for ENOENT error', () => {
      const error = new Error('File not found') as NodeSystemError;
      error.code = 'ENOENT';
      expect(isFileNotFoundError(error)).toBe(true);
    });

    it('should return false for EACCES error', () => {
      const error = new Error('Permission denied') as NodeSystemError;
      error.code = 'EACCES';
      expect(isFileNotFoundError(error)).toBe(false);
    });

    it('should return false for EISDIR error', () => {
      const error = new Error('Is a directory') as NodeSystemError;
      error.code = 'EISDIR';
      expect(isFileNotFoundError(error)).toBe(false);
    });

    it('should return false for plain Error without code', () => {
      const error = new Error('Simple error');
      expect(isFileNotFoundError(error)).toBe(false);
    });

    it('should return false for non-Error object', () => {
      const notError = { code: 'ENOENT' };
      expect(isFileNotFoundError(notError)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isFileNotFoundError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isFileNotFoundError(undefined)).toBe(false);
    });
  });

  describe('getErrorCode', () => {
    it('should return code for NodeSystemError', () => {
      const error = new Error('System error') as NodeSystemError;
      error.code = 'ENOENT';
      expect(getErrorCode(error)).toBe('ENOENT');
    });

    it('should return undefined for plain Error', () => {
      const error = new Error('Simple error');
      expect(getErrorCode(error)).toBeUndefined();
    });

    it('should return undefined for non-Error object', () => {
      const notError = { code: 'ENOENT', message: 'Not an error' };
      expect(getErrorCode(notError)).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(getErrorCode(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(getErrorCode(undefined)).toBeUndefined();
    });

    it('should return undefined for string', () => {
      expect(getErrorCode('error string')).toBeUndefined();
    });

    it('should return code for different error codes', () => {
      const error1 = new Error('Error 1') as NodeSystemError;
      error1.code = 'EACCES';
      expect(getErrorCode(error1)).toBe('EACCES');

      const error2 = new Error('Error 2') as NodeSystemError;
      error2.code = 'EISDIR';
      expect(getErrorCode(error2)).toBe('EISDIR');
    });
  });
});
