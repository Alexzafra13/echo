import { ValidationError } from '@shared/errors';

// Value Object: contraseña validada (min 8 chars, mayúscula, minúscula, número, especial)
export class Password {
  private readonly value: string;

  constructor(password: string) {
    if (!this.isValid(password)) {
      throw new ValidationError(
        'Password must be at least 8 characters, with uppercase, lowercase, number and special character'
      );
    }
    this.value = password;
  }

  private isValid(password: string): boolean {
    if (password.length < 8) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/\d/.test(password)) return false;
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return false;
    return true;
  }

  getValue(): string {
    return this.value;
  }
}
