import { Username } from './username.vo';
import { ValidationError } from '@shared/errors';

describe('Username Value Object', () => {
  describe('valid usernames', () => {
    it('should accept alphanumeric username', () => {
      const username = new Username('john123');
      expect(username.getValue()).toBe('john123');
    });

    it('should accept username with underscores', () => {
      const username = new Username('john_doe');
      expect(username.getValue()).toBe('john_doe');
    });

    it('should accept 3-character username (minimum)', () => {
      const username = new Username('abc');
      expect(username.getValue()).toBe('abc');
    });

    it('should accept 50-character username (maximum)', () => {
      const long = 'a'.repeat(50);
      const username = new Username(long);
      expect(username.getValue()).toBe(long);
    });

    it('should accept uppercase letters', () => {
      const username = new Username('JohnDoe');
      expect(username.getValue()).toBe('JohnDoe');
    });
  });

  describe('invalid usernames', () => {
    it('should reject empty string', () => {
      expect(() => new Username('')).toThrow(ValidationError);
    });

    it('should reject username shorter than 3 characters', () => {
      expect(() => new Username('ab')).toThrow(ValidationError);
    });

    it('should reject username longer than 50 characters', () => {
      expect(() => new Username('a'.repeat(51))).toThrow(ValidationError);
    });

    it('should reject username with spaces', () => {
      expect(() => new Username('john doe')).toThrow(ValidationError);
    });

    it('should reject username with special characters', () => {
      expect(() => new Username('john@doe')).toThrow(ValidationError);
      expect(() => new Username('john!doe')).toThrow(ValidationError);
      expect(() => new Username('john-doe')).toThrow(ValidationError);
      expect(() => new Username('john.doe')).toThrow(ValidationError);
    });

    it('should throw correct error message', () => {
      expect(() => new Username('x')).toThrow(
        'Username must be 3-50 characters, alphanumeric and underscore only',
      );
    });
  });

  describe('equality', () => {
    it('should return true for equal usernames', () => {
      const a = new Username('john');
      const b = new Username('john');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different usernames', () => {
      const a = new Username('john');
      const b = new Username('jane');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value', () => {
      const username = new Username('john');
      expect(username.toString()).toBe('john');
    });
  });
});
