import { BaseError } from './base.error';

/**
 * Error thrown when infrastructure components fail (Redis, Database, etc).
 */
export class InfrastructureError extends BaseError {
  constructor(
    public readonly component: InfrastructureComponent,
    public readonly reason: string,
  ) {
    const message = `${component} error: ${reason}`;
    super('INFRASTRUCTURE_ERROR', message);
    Object.setPrototypeOf(this, InfrastructureError.prototype);
  }
}

export type InfrastructureComponent = 'REDIS' | 'DATABASE' | 'FILESYSTEM' | 'QUEUE';

/**
 * Error thrown when a repository operation is not supported.
 */
export class RepositoryError extends BaseError {
  constructor(
    public readonly operation: string,
    public readonly reason: string,
  ) {
    const message = `Repository ${operation} failed: ${reason}`;
    super('REPOSITORY_ERROR', message);
    Object.setPrototypeOf(this, RepositoryError.prototype);
  }
}
