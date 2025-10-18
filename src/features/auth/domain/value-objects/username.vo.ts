import { ValidationError } from '@shared/errors';

/**
 * Username Value Object - Representa un nombre de usuario validado
 *
 * Responsabilidades:
 * - Validar que el username tenga formato correcto
 * - Normalizar el username (trim)
 * - Comparar usernames
 * - NO tiene identidad - es solo el valor "juan_123"
 *
 * Reglas:
 * - 3-50 caracteres
 * - Solo alfanuméricos y underscore
 * - No puede tener espacios o caracteres especiales
 */
export class Username {
  private readonly value: string;

  /**
   * Constructor
   * Si el username no es válido, lanza ValidationError
   */
  constructor(username: string) {
    if (!this.isValid(username)) {
      throw new ValidationError(
        'Username must be 3-50 characters, alphanumeric and underscore only',
      );
    }
    this.value = username.trim();
  }

  /**
   * Valida que el username cumpla las reglas
   * Regex: 3-50 caracteres, solo letras, números y underscore
   */
  private isValid(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    return usernameRegex.test(username);
  }

  /**
   * Retorna el valor del username
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Compara si dos usernames son iguales
   */
  equals(other: Username): boolean {
    return this.value === other.value;
  }

  /**
   * Retorna como string
   */
  toString(): string {
    return this.value;
  }
}