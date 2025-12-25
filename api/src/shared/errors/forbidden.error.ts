import { BaseError } from './base.error';

export class ForbiddenError extends BaseError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}