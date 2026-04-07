import { encryptString, decryptString, isEncrypted } from './encryption.util';

describe('Encryption Utility', () => {
  const masterSecret = 'test-master-secret-for-unit-tests';

  describe('encryptString / decryptString roundtrip', () => {
    it('should encrypt and decrypt back to the original string', () => {
      const plaintext = 'my-secret-auth-token-12345';
      const encrypted = encryptString(plaintext, masterSecret);
      const decrypted = decryptString(encrypted, masterSecret);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const encrypted = encryptString('', masterSecret);
      const decrypted = decryptString(encrypted, masterSecret);
      expect(decrypted).toBe('');
    });

    it('should handle unicode content', () => {
      const plaintext = 'token-with-unicode-\u00e9\u00e0\u00fc-\u{1f680}';
      const encrypted = encryptString(plaintext, masterSecret);
      const decrypted = decryptString(encrypted, masterSecret);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('decryptString with wrong secret', () => {
    it('should return null when decrypting with a different secret', () => {
      const encrypted = encryptString('secret-data', masterSecret);
      const result = decryptString(encrypted, 'wrong-secret');
      expect(result).toBeNull();
    });
  });

  describe('decryptString with corrupted data', () => {
    it('should return null for corrupted ciphertext', () => {
      const encrypted = encryptString('secret-data', masterSecret);
      const parts = encrypted.split(':');
      parts[2] = 'deadbeef';
      const corrupted = parts.join(':');
      const result = decryptString(corrupted, masterSecret);
      expect(result).toBeNull();
    });

    it('should return null for completely invalid input', () => {
      expect(decryptString('not-encrypted-at-all', masterSecret)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(decryptString('', masterSecret)).toBeNull();
    });
  });

  describe('isEncrypted', () => {
    it('should detect encrypted strings', () => {
      const encrypted = encryptString('test-token', masterSecret);
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain strings', () => {
      expect(isEncrypted('plain-auth-token')).toBe(false);
    });

    it('should return false for strings with wrong number of parts', () => {
      expect(isEncrypted('part1:part2')).toBe(false);
      expect(isEncrypted('part1:part2:part3:part4')).toBe(false);
    });

    it('should return false for strings with wrong segment lengths', () => {
      expect(isEncrypted('short:short:data')).toBe(false);
    });
  });

  describe('random IV ensures unique ciphertexts', () => {
    it('should produce different ciphertexts for the same plaintext and secret', () => {
      const plaintext = 'same-token';
      const encrypted1 = encryptString(plaintext, masterSecret);
      const encrypted2 = encryptString(plaintext, masterSecret);
      expect(encrypted1).not.toBe(encrypted2);
      // But both should decrypt to the same value
      expect(decryptString(encrypted1, masterSecret)).toBe(plaintext);
      expect(decryptString(encrypted2, masterSecret)).toBe(plaintext);
    });
  });
});
