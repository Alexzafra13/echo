/**
 * Type guard and utilities for handling Node.js system errors
 */

/**
 * Node.js system error with errno code
 * Common codes: ENOENT (file not found), EACCES (permission denied), etc.
 */
export interface NodeSystemError extends Error {
  code?: string;
  errno?: number;
  syscall?: string;
  path?: string;
}

/**
 * Type guard to check if an error is a Node.js system error with a code
 */
export function isNodeSystemError(error: unknown): error is NodeSystemError {
  return error instanceof Error && 'code' in error;
}

/**
 * Check if error is a "file not found" error (ENOENT)
 */
export function isFileNotFoundError(error: unknown): boolean {
  return isNodeSystemError(error) && error.code === 'ENOENT';
}

/**
 * Safely get error code from any error
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isNodeSystemError(error)) {
    return error.code;
  }
  return undefined;
}
