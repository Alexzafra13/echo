import { ValidationError } from '@shared/errors';

// Value Object: username validado (3-50 chars, alfanumérico y underscore)
export class Username {
  private readonly value: string;

  constructor(username: string) {
    const trimmed = username.trim();
    if (!this.isValid(trimmed)) {
      throw new ValidationError(
        'Username must be 3-50 characters, alphanumeric and underscore only'
      );
    }
    this.value = trimmed;
  }

  private isValid(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    return usernameRegex.test(username);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Username): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
