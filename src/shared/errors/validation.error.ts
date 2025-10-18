import { BaseError } from './base.error';

export class ValidationError extends BaseError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}