import { BaseError } from './base.error';

/**
 * Error thrown when a repository operation is not supported.
 */
export class RepositoryError extends BaseError {
  constructor(
    public readonly operation: string,
    public readonly reason: string
  ) {
    const message = `Repository ${operation} failed: ${reason}`;
    super('REPOSITORY_ERROR', message);
    Object.setPrototypeOf(this, RepositoryError.prototype);
  }
}
