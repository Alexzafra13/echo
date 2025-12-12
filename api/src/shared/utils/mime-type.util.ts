/**
 * MIME type mappings for audio files
 */
export const AUDIO_MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.wma': 'audio/x-ms-wma',
  '.opus': 'audio/opus',
  '.aiff': 'audio/aiff',
  '.ape': 'audio/ape',
  '.alac': 'audio/alac',
};

/**
 * MIME type mappings for image files
 */
export const IMAGE_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
};

/**
 * All MIME types combined
 */
export const ALL_MIME_TYPES: Record<string, string> = {
  ...AUDIO_MIME_TYPES,
  ...IMAGE_MIME_TYPES,
};

/**
 * Gets MIME type from file extension
 * @param ext File extension (with or without leading dot)
 * @param defaultType Default MIME type if extension not found
 */
export function getMimeType(ext: string, defaultType = 'application/octet-stream'): string {
  const normalizedExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return ALL_MIME_TYPES[normalizedExt] || defaultType;
}

/**
 * Gets audio MIME type from file extension
 */
export function getAudioMimeType(ext: string): string {
  const normalizedExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return AUDIO_MIME_TYPES[normalizedExt] || 'audio/mpeg';
}

/**
 * Gets image MIME type from file extension
 */
export function getImageMimeType(ext: string): string {
  const normalizedExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return IMAGE_MIME_TYPES[normalizedExt] || 'image/jpeg';
}

/**
 * Reverse mapping: MIME type to file extension
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  // Image types
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'image/svg+xml': '.svg',
  // Audio types
  'audio/mpeg': '.mp3',
  'audio/flac': '.flac',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'audio/wav': '.wav',
  'audio/x-ms-wma': '.wma',
  'audio/opus': '.opus',
  'audio/aiff': '.aiff',
  'audio/ape': '.ape',
  'audio/alac': '.alac',
};

/**
 * Gets file extension from MIME type
 * @param mimeType MIME type string
 * @param defaultExt Default extension if MIME type not found (default: '.bin')
 */
export function getExtensionFromMimeType(mimeType: string, defaultExt = '.bin'): string {
  return MIME_TO_EXTENSION[mimeType.toLowerCase()] || defaultExt;
}

/**
 * Gets image file extension from MIME type
 * @param mimeType MIME type string
 */
export function getImageExtensionFromMimeType(mimeType: string): string {
  return getExtensionFromMimeType(mimeType, '.jpg');
}

/**
 * Gets audio file extension from MIME type
 * @param mimeType MIME type string
 */
export function getAudioExtensionFromMimeType(mimeType: string): string {
  return getExtensionFromMimeType(mimeType, '.mp3');
}
