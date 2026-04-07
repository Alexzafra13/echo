import { ValidationError } from '@shared/errors';

/** Regex para caracteres especiales en contraseñas — fuente de verdad única */
export const PASSWORD_SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

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
    if (!PASSWORD_SPECIAL_CHARS_REGEX.test(password)) return false;
    return true;
  }

  getValue(): string {
    return this.value;
  }
}
