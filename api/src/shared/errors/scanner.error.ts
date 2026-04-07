import { BaseError } from './base.error';

/**
 * Error thrown when scanner operations fail.
 */
export class ScannerError extends BaseError {
  constructor(
    public readonly reason: ScannerErrorReason,
    public readonly details?: string,
  ) {
    const message = ScannerError.buildMessage(reason, details);
    super('SCANNER_ERROR', message);
    Object.setPrototypeOf(this, ScannerError.prototype);
  }

  private static buildMessage(reason: ScannerErrorReason, details?: string): string {
    switch (reason) {
      case 'SCAN_ALREADY_RUNNING':
        return 'A scan is already running. Please wait for it to complete.';
      case 'NO_LIBRARY_PATH':
        return 'No library path configured';
      case 'INVALID_PATH':
        return details || 'Invalid library path';
      default:
        return details || 'Scanner operation failed';
    }
  }
}

export type ScannerErrorReason =
  | 'SCAN_ALREADY_RUNNING'
  | 'NO_LIBRARY_PATH'
  | 'INVALID_PATH';
