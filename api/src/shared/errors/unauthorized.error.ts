import { BaseError } from './base.error';

export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}