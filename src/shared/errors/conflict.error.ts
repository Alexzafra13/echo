import { BaseError } from './base.error';

export class ConflictError extends BaseError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}