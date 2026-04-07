import { BaseError } from './base.error';

/**
 * Error thrown when image processing or validation fails.
 */
export class ImageProcessingError extends BaseError {
  constructor(
    public readonly reason: ImageErrorReason,
    public readonly details?: string,
  ) {
    const message = ImageProcessingError.buildMessage(reason, details);
    super('IMAGE_PROCESSING_ERROR', message);
    Object.setPrototypeOf(this, ImageProcessingError.prototype);
  }

  private static buildMessage(reason: ImageErrorReason, details?: string): string {
    switch (reason) {
      case 'INVALID_DIMENSIONS':
        return details || 'Failed to detect image dimensions';
      case 'INVALID_CONTENT_TYPE':
        return `Invalid content type: ${details}`;
      case 'FILE_TOO_LARGE':
        return `Image too large: ${details}`;
      case 'INVALID_IMAGE':
        return 'Downloaded file is not a valid image';
      case 'DOWNLOAD_FAILED':
        return details || 'Failed to download image';
      default:
        return details || 'Image processing failed';
    }
  }
}

export type ImageErrorReason =
  | 'INVALID_DIMENSIONS'
  | 'INVALID_CONTENT_TYPE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_IMAGE'
  | 'DOWNLOAD_FAILED';
