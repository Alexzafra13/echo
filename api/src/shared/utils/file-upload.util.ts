import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';

/**
 * File upload configuration
 */
export interface FileUploadConfig {
  readonly maxSizeBytes: number;
  readonly allowedMimeTypes: readonly string[];
}

/**
 * Default configurations for different upload types
 */
export const FILE_UPLOAD_CONFIGS = {
  image: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  },
  avatar: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
} as const;

/**
 * Validates a file against upload configuration
 * @throws BadRequestException if validation fails
 */
export function validateFileUpload(
  file: { mimetype: string; size: number } | null | undefined,
  config: FileUploadConfig = FILE_UPLOAD_CONFIGS.image,
): void {
  if (!file) {
    throw new BadRequestException('No file provided');
  }

  if (!config.allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      `Invalid file type. Allowed types: ${config.allowedMimeTypes.join(', ')}`,
    );
  }

  if (file.size > config.maxSizeBytes) {
    const maxSizeMB = config.maxSizeBytes / 1024 / 1024;
    throw new BadRequestException(`File size exceeds ${maxSizeMB}MB limit`);
  }
}

/**
 * Generates a unique filename with hash and timestamp
 */
export function generateUniqueFilename(
  originalFilename: string,
  prefix: string,
): string {
  const fileHash = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalFilename);
  return `${prefix}_${Date.now()}_${fileHash}${ext}`;
}

/**
 * Normalizes a path to Unix-style separators for cross-platform compatibility
 * Windows path.relative() returns backslashes (\) which don't work on Unix systems
 */
export function normalizePathSeparators(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
