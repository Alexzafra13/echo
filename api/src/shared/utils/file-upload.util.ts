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
 * Known file signatures (magic bytes) for allowed image types.
 * Used to verify that the actual file content matches the declared MIME type,
 * preventing MIME type spoofing attacks.
 */
const IMAGE_SIGNATURES: Array<{
  bytes: number[];
  offset?: number;
  extraCheck?: (buffer: Buffer) => boolean;
  mimeTypes: string[];
}> = [
  {
    bytes: [0xff, 0xd8, 0xff],
    mimeTypes: ['image/jpeg', 'image/jpg'],
  },
  {
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    mimeTypes: ['image/png'],
  },
  {
    // WebP: starts with RIFF header, then has "WEBP" at offset 8
    bytes: [0x52, 0x49, 0x46, 0x46],
    extraCheck: (buf) =>
      buf.length >= 12 &&
      buf[8] === 0x57 && // W
      buf[9] === 0x45 && // E
      buf[10] === 0x42 && // B
      buf[11] === 0x50, // P
    mimeTypes: ['image/webp'],
  },
];

/**
 * Validates that the file's actual content matches the declared MIME type
 * by checking magic bytes (file signature).
 *
 * @param buffer - First bytes of the file (at least 12 bytes recommended)
 * @param declaredMimeType - The MIME type declared by the upload
 * @returns true if the magic bytes match the declared type
 */
function validateMagicBytes(buffer: Buffer, declaredMimeType: string): boolean {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  for (const sig of IMAGE_SIGNATURES) {
    if (!sig.mimeTypes.includes(declaredMimeType)) {
      continue;
    }

    const offset = sig.offset ?? 0;
    const matches = sig.bytes.every((byte, i) => buffer[offset + i] === byte);

    if (matches) {
      return sig.extraCheck ? sig.extraCheck(buffer) : true;
    }
  }

  return false;
}

/**
 * Validates a file against upload configuration.
 * Checks MIME type whitelist, file size, and optionally magic bytes.
 *
 * @param file - File metadata (mimetype, size)
 * @param config - Upload configuration with allowed types and size limits
 * @param buffer - Optional file buffer for magic bytes validation
 * @throws BadRequestException if validation fails
 */
export function validateFileUpload(
  file: { mimetype: string; size: number } | null | undefined,
  config: FileUploadConfig = FILE_UPLOAD_CONFIGS.image,
  buffer?: Buffer
): void {
  if (!file) {
    throw new BadRequestException('No file provided');
  }

  if (!config.allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      `Invalid file type. Allowed types: ${config.allowedMimeTypes.join(', ')}`
    );
  }

  if (file.size > config.maxSizeBytes) {
    const maxSizeMB = config.maxSizeBytes / 1024 / 1024;
    throw new BadRequestException(`File size exceeds ${maxSizeMB}MB limit`);
  }

  // Validate magic bytes if buffer is provided
  if (buffer && !validateMagicBytes(buffer, file.mimetype)) {
    throw new BadRequestException('File content does not match declared type');
  }
}

/**
 * Generates a unique filename with hash and timestamp
 */
export function generateUniqueFilename(originalFilename: string, prefix: string): string {
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

/**
 * Maps MIME types to file extensions
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Gets file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType] || 'jpg';
}
