export class BaseError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    Object.setPrototypeOf(this, BaseError.prototype);
  }
}