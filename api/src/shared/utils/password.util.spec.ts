import { PasswordUtil } from './password.util';

describe('PasswordUtil', () => {
  describe('generateTemporaryPassword', () => {
    it('should generate a password of exactly 16 characters', () => {
      const password = PasswordUtil.generateTemporaryPassword();
      expect(password).toHaveLength(16);
    });

    it('should contain at least one uppercase letter', () => {
      const passwords = Array.from({ length: 10 }, () => PasswordUtil.generateTemporaryPassword());
      passwords.forEach((pwd) => {
        expect(/[A-Z]/.test(pwd)).toBe(true);
      });
    });

    it('should contain at least one lowercase letter', () => {
      const passwords = Array.from({ length: 10 }, () => PasswordUtil.generateTemporaryPassword());
      passwords.forEach((pwd) => {
        expect(/[a-z]/.test(pwd)).toBe(true);
      });
    });

    it('should contain at least one number', () => {
      const passwords = Array.from({ length: 10 }, () => PasswordUtil.generateTemporaryPassword());
      passwords.forEach((pwd) => {
        expect(/[0-9]/.test(pwd)).toBe(true);
      });
    });

    it('should contain at least one special character', () => {
      const passwords = Array.from({ length: 10 }, () => PasswordUtil.generateTemporaryPassword());
      passwords.forEach((pwd) => {
        expect(/[!@#$%&*?]/.test(pwd)).toBe(true);
      });
    });

    it('should NOT contain visually ambiguous characters (I, O, l, 0, 1)', () => {
      const passwords = Array.from({ length: 100 }, () => PasswordUtil.generateTemporaryPassword());
      passwords.forEach((pwd) => {
        expect(pwd).not.toContain('I');
        expect(pwd).not.toContain('O');
        expect(pwd).not.toContain('l');
        expect(pwd).not.toContain('0');
        expect(pwd).not.toContain('1');
      });
    });

    it('should generate different passwords each time', () => {
      const passwords = Array.from({ length: 5 }, () => PasswordUtil.generateTemporaryPassword());
      const uniquePasswords = new Set(passwords);
      expect(uniquePasswords.size).toBeGreaterThanOrEqual(4);
    });

    it('should generate passwords with high entropy (100 unique passwords)', () => {
      const passwords = Array.from({ length: 100 }, () => PasswordUtil.generateTemporaryPassword());
      const uniquePasswords = new Set(passwords);
      expect(uniquePasswords.size).toBeGreaterThanOrEqual(95);
    });

    it('should use only allowed characters', () => {
      const allowedUppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const allowedLowercase = 'abcdefghjkmnpqrstuvwxyz';
      const allowedNumbers = '23456789';
      const allowedSpecial = '!@#$%&*?';
      const allAllowed = allowedUppercase + allowedLowercase + allowedNumbers + allowedSpecial;

      const passwords = Array.from({ length: 100 }, () => PasswordUtil.generateTemporaryPassword());
      passwords.forEach((pwd) => {
        for (const char of pwd) {
          expect(allAllowed).toContain(char);
        }
      });
    });

    it('should have consistent format: 16 characters with mixed character types', () => {
      const passwords = Array.from({ length: 200 }, () => PasswordUtil.generateTemporaryPassword());
      passwords.forEach((pwd) => {
        expect(pwd).toHaveLength(16);
        expect(/[A-Z]/.test(pwd)).toBe(true);
        expect(/[a-z]/.test(pwd)).toBe(true);
        expect(/[0-9]/.test(pwd)).toBe(true);
        expect(/[!@#$%&*?]/.test(pwd)).toBe(true);
      });
    });
  });
});
