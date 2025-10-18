import { ValidationError } from '@shared/errors';

/**
 * Email Value Object - Representa un email validado
 *
 * Responsabilidades:
 * - Validar que el email tenga formato correcto
 * - Normalizar el email (lowercase, trim)
 * - Comparar emails
 * - NO tiene identidad - es solo el valor "juan@example.com"
 *
 * Ventaja: Si intenta crear Email('invalido') → tira error inmediatamente
 * No puedes tener un email inválido en tu sistema
 */
export class Email {
  private readonly value: string;

  /**
   * Constructor
   * Si el email no es válido, lanza ValidationError
   */
  constructor(email: string) {
    if (!this.isValid(email)) {
      throw new ValidationError('Invalid email format');
    }
    // Normalizar: minúsculas y sin espacios
    this.value = email.toLowerCase().trim();
  }

  /**
   * Valida que sea un email con formato básico
   * Usa regex simple pero funcional
   */
  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Retorna el valor del email
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Compara si dos emails son iguales
   */
  equals(other: Email): boolean {
    return this.value === other.value;
  }

  /**
   * Retorna como string (útil para logs, etc)
   */
  toString(): string {
    return this.value;
  }
}