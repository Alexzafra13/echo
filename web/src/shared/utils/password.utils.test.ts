import { describe, it, expect } from 'vitest';
import {
  passwordRequirements,
  getPasswordRequirementLabels,
  validatePasswordStrength,
} from './password.utils';

describe('passwordRequirements', () => {
  describe('minLength', () => {
    it('should pass for passwords with 8+ characters', () => {
      expect(passwordRequirements.minLength('12345678')).toBe(true);
      expect(passwordRequirements.minLength('abcdefghijklm')).toBe(true);
    });

    it('should fail for passwords under 8 characters', () => {
      expect(passwordRequirements.minLength('1234567')).toBe(false);
      expect(passwordRequirements.minLength('')).toBe(false);
      expect(passwordRequirements.minLength('abc')).toBe(false);
    });
  });

  describe('hasUpperCase', () => {
    it('should pass when uppercase letter present', () => {
      expect(passwordRequirements.hasUpperCase('Password')).toBe(true);
      expect(passwordRequirements.hasUpperCase('pA')).toBe(true);
    });

    it('should fail when no uppercase letter', () => {
      expect(passwordRequirements.hasUpperCase('password')).toBe(false);
      expect(passwordRequirements.hasUpperCase('12345')).toBe(false);
    });
  });

  describe('hasLowerCase', () => {
    it('should pass when lowercase letter present', () => {
      expect(passwordRequirements.hasLowerCase('Password')).toBe(true);
    });

    it('should fail when no lowercase letter', () => {
      expect(passwordRequirements.hasLowerCase('PASSWORD')).toBe(false);
      expect(passwordRequirements.hasLowerCase('12345')).toBe(false);
    });
  });

  describe('hasNumber', () => {
    it('should pass when digit present', () => {
      expect(passwordRequirements.hasNumber('pass1')).toBe(true);
    });

    it('should fail when no digit', () => {
      expect(passwordRequirements.hasNumber('password')).toBe(false);
    });
  });

  describe('hasSpecialChar', () => {
    it('should pass for common special characters', () => {
      expect(passwordRequirements.hasSpecialChar('pass!')).toBe(true);
      expect(passwordRequirements.hasSpecialChar('pass@')).toBe(true);
      expect(passwordRequirements.hasSpecialChar('pass#')).toBe(true);
      expect(passwordRequirements.hasSpecialChar('pass$')).toBe(true);
      expect(passwordRequirements.hasSpecialChar('pass_')).toBe(true);
      expect(passwordRequirements.hasSpecialChar('pass.')).toBe(true);
    });

    it('should fail when no special character', () => {
      expect(passwordRequirements.hasSpecialChar('Password1')).toBe(false);
      expect(passwordRequirements.hasSpecialChar('abcABC123')).toBe(false);
    });
  });
});

describe('getPasswordRequirementLabels', () => {
  it('should have 5 requirements', () => {
    expect(getPasswordRequirementLabels()).toHaveLength(5);
  });

  it('should have label and check function for each requirement', () => {
    getPasswordRequirementLabels().forEach((req) => {
      expect(req.label).toBeDefined();
      expect(typeof req.check).toBe('function');
      expect(req.key).toBeDefined();
    });
  });
});

describe('validatePasswordStrength', () => {
  it('should return null for a valid password', () => {
    expect(validatePasswordStrength('MyPass1!')).toBeNull();
    expect(validatePasswordStrength('StrongP@ss1')).toBeNull();
    expect(validatePasswordStrength('C0mpl3x!Pass')).toBeNull();
  });

  it('should return error for password too short', () => {
    const result = validatePasswordStrength('Aa1!');
    expect(result).not.toBeNull();
    expect(result).toContain('8 caracteres');
  });

  it('should return error for missing uppercase', () => {
    const result = validatePasswordStrength('password1!');
    expect(result).not.toBeNull();
    expect(result).toContain('mayúscula');
  });

  it('should return error for missing lowercase', () => {
    const result = validatePasswordStrength('PASSWORD1!');
    expect(result).not.toBeNull();
    expect(result).toContain('minúscula');
  });

  it('should return error for missing number', () => {
    const result = validatePasswordStrength('Password!');
    expect(result).not.toBeNull();
    expect(result).toContain('número');
  });

  it('should return error for missing special character', () => {
    const result = validatePasswordStrength('Password1');
    expect(result).not.toBeNull();
    expect(result).toContain('especial');
  });

  it('should return only the first unmet requirement', () => {
    // Empty string fails minLength first
    const result = validatePasswordStrength('');
    expect(result).toContain('8 caracteres');
  });
});
