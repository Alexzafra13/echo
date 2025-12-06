import * as fs from 'fs/promises';
import { Logger } from '@nestjs/common';

const logger = new Logger('FileSystemUtil');

/**
 * Safely deletes a file, logging warnings on failure instead of throwing
 * @returns true if deleted successfully, false otherwise
 */
export async function safeDeleteFile(
  filePath: string | null | undefined,
  context?: string,
): Promise<boolean> {
  if (!filePath) {
    return false;
  }

  try {
    await fs.unlink(filePath);
    logger.debug(`Deleted file: ${filePath}${context ? ` (${context})` : ''}`);
    return true;
  } catch (error) {
    logger.warn(
      `Failed to delete file: ${filePath}${context ? ` (${context})` : ''} - ${(error as Error).message}`,
    );
    return false;
  }
}

/**
 * Ensures a directory exists, creating it if necessary
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Checks if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely writes a file with error handling
 * @throws Error if write fails
 */
export async function writeFileSafe(
  filePath: string,
  content: Buffer | string,
  errorMessage = 'Failed to write file',
): Promise<void> {
  try {
    await fs.writeFile(filePath, content);
  } catch (error) {
    logger.error(`${errorMessage}: ${(error as Error).message}`);
    throw error;
  }
}
