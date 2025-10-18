import { BaseError } from './base.error';

export class NotFoundError extends BaseError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super('NOT_FOUND', message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}