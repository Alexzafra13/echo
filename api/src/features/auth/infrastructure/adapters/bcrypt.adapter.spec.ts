jest.mock('bcrypt');

import * as bcrypt from 'bcrypt';
import { BcryptAdapter } from './bcrypt.adapter';

describe('BcryptAdapter', () => {
  let adapter: BcryptAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new BcryptAdapter();
  });

  describe('hash', () => {
    it('should hash a password with 12 rounds', async () => {
      const hashedPassword = '$2b$12$hashed_password_123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await adapter.hash('MyPassword123!');

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith('MyPassword123!', 12);
    });

    it('should return different hashes for different passwords', async () => {
      (bcrypt.hash as jest.Mock)
        .mockResolvedValueOnce('$2b$12$hash_a')
        .mockResolvedValueOnce('$2b$12$hash_b');

      const hashA = await adapter.hash('passwordA');
      const hashB = await adapter.hash('passwordB');

      expect(hashA).not.toBe(hashB);
    });

    it('should propagate bcrypt errors', async () => {
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hash error'));

      await expect(adapter.hash('password')).rejects.toThrow('Hash error');
    });
  });

  describe('compare', () => {
    it('should return true when passwords match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await adapter.compare('MyPassword123!', '$2b$12$hashed');

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('MyPassword123!', '$2b$12$hashed');
    });

    it('should return false when passwords do not match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await adapter.compare('WrongPassword!', '$2b$12$hashed');

      expect(result).toBe(false);
    });

    it('should propagate bcrypt errors', async () => {
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Compare error'));

      await expect(
        adapter.compare('password', 'invalid_hash'),
      ).rejects.toThrow('Compare error');
    });
  });
});
