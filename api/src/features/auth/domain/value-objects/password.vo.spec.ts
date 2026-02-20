import { Password } from './password.vo';
import { ValidationError } from '@shared/errors';

describe('Password Value Object', () => {
  describe('valid passwords', () => {
    it('should accept a password with all requirements', () => {
      const pw = new Password('MyPass1!');
      expect(pw.getValue()).toBe('MyPass1!');
    });

    it('should accept a long complex password', () => {
      const pw = new Password('Super$ecure123Password!');
      expect(pw.getValue()).toBe('Super$ecure123Password!');
    });

    it('should accept different special characters', () => {
      expect(new Password('Test123@x').getValue()).toBe('Test123@x');
      expect(new Password('Test123$x').getValue()).toBe('Test123$x');
      expect(new Password('Test123!x').getValue()).toBe('Test123!x');
      expect(new Password('Test123%x').getValue()).toBe('Test123%x');
      expect(new Password('Test123*x').getValue()).toBe('Test123*x');
      expect(new Password('Test123?x').getValue()).toBe('Test123?x');
      expect(new Password('Test123&x').getValue()).toBe('Test123&x');
    });
  });

  describe('invalid passwords', () => {
    it('should reject empty string', () => {
      expect(() => new Password('')).toThrow(ValidationError);
    });

    it('should reject password shorter than 8 characters', () => {
      expect(() => new Password('Ab1!xyz')).toThrow(ValidationError);
    });

    it('should reject password without uppercase', () => {
      expect(() => new Password('mypass1!')).toThrow(ValidationError);
    });

    it('should reject password without lowercase', () => {
      expect(() => new Password('MYPASS1!')).toThrow(ValidationError);
    });

    it('should reject password without number', () => {
      expect(() => new Password('MyPasswd!')).toThrow(ValidationError);
    });

    it('should reject password without special character', () => {
      expect(() => new Password('MyPasswd1')).toThrow(ValidationError);
    });

    it('should throw correct error message', () => {
      expect(() => new Password('weak')).toThrow(
        'Password must be at least 8 characters, with uppercase, lowercase, number and special character',
      );
    });
  });
});
