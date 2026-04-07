jest.mock('fs/promises');

import * as fs from 'fs/promises';
import { safeDeleteFile, ensureDirectory, fileExists, writeFileSafe } from './file-system.util';

describe('FileSystemUtil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('safeDeleteFile', () => {
    it('should return false for null', async () => {
      const result = await safeDeleteFile(null);
      expect(result).toBe(false);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should return false for undefined', async () => {
      const result = await safeDeleteFile(undefined);
      expect(result).toBe(false);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should return true on success', async () => {
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
      const result = await safeDeleteFile('/path/to/file.txt');
      expect(result).toBe(true);
      expect(fs.unlink).toHaveBeenCalledWith('/path/to/file.txt');
    });

    it('should return false on error', async () => {
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('File not found'));
      const result = await safeDeleteFile('/path/to/file.txt');
      expect(result).toBe(false);
      expect(fs.unlink).toHaveBeenCalledWith('/path/to/file.txt');
    });

    it('should include context in log messages', async () => {
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
      const result = await safeDeleteFile('/path/to/file.txt', 'test context');
      expect(result).toBe(true);
    });
  });

  describe('ensureDirectory', () => {
    it('should call mkdir with recursive:true', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      await ensureDirectory('/path/to/dir');
      expect(fs.mkdir).toHaveBeenCalledWith('/path/to/dir', { recursive: true });
    });
  });

  describe('fileExists', () => {
    it('should return true on success', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      const result = await fileExists('/path/to/file.txt');
      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith('/path/to/file.txt');
    });

    it('should return false on error', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      const result = await fileExists('/path/to/file.txt');
      expect(result).toBe(false);
      expect(fs.access).toHaveBeenCalledWith('/path/to/file.txt');
    });
  });

  describe('writeFileSafe', () => {
    it('should call writeFile with content', async () => {
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      await writeFileSafe('/path/to/file.txt', 'content');
      expect(fs.writeFile).toHaveBeenCalledWith('/path/to/file.txt', 'content');
    });

    it('should call writeFile with Buffer content', async () => {
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      const buffer = Buffer.from('content');
      await writeFileSafe('/path/to/file.txt', buffer);
      expect(fs.writeFile).toHaveBeenCalledWith('/path/to/file.txt', buffer);
    });

    it('should rethrow on error', async () => {
      const error = new Error('Write failed');
      (fs.writeFile as jest.Mock).mockRejectedValue(error);
      await expect(writeFileSafe('/path/to/file.txt', 'content')).rejects.toThrow('Write failed');
    });

    it('should use custom error message', async () => {
      const error = new Error('Disk full');
      (fs.writeFile as jest.Mock).mockRejectedValue(error);
      await expect(
        writeFileSafe('/path/to/file.txt', 'content', 'Custom error message')
      ).rejects.toThrow('Disk full');
    });
  });
});
