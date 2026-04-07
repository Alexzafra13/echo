import { BaseError } from './base.error';

/**
 * Error thrown when a request times out.
 */
export class TimeoutError extends BaseError {
  constructor(
    public readonly timeoutMs: number,
    public readonly operation?: string,
  ) {
    const message = operation
      ? `${operation} timed out after ${timeoutMs}ms`
      : `Request timed out after ${timeoutMs}ms`;
    super('TIMEOUT_ERROR', message);
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}
