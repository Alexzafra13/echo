import { ValidationError } from '@shared/errors';

// Value Object: contraseña validada (min 8 chars, mayúscula, minúscula, número, especial)
export class Password {
  private readonly value: string;

  constructor(password: string) {
    if (!this.isValid(password)) {
      throw new ValidationError(
        'Password must be at least 8 characters, with uppercase, lowercase, number and special character',
      );
    }
    this.value = password;
  }

  private isValid(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  getValue(): string {
    return this.value;
  }
}