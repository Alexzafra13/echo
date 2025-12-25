import { BaseError } from './base.error';

export class ValidationError extends BaseError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}