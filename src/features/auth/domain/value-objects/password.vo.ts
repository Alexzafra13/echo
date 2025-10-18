import { ValidationError } from '@shared/errors';

/**
 * Password Value Object - Representa una contraseña validada
 *
 * Responsabilidades:
 * - Validar que la contraseña cumpla políticas de seguridad
 * - Almacenar la contraseña en TEXTO PLANO (se hashea después en Infrastructure)
 * - NO tiene identidad - es solo el valor "MyPass123!"
 *
 * Reglas de seguridad:
 * - Mínimo 8 caracteres
 * - Al menos 1 mayúscula
 * - Al menos 1 minúscula
 * - Al menos 1 número
 * - Al menos 1 carácter especial: @$!%*?&
 */
export class Password {
  private readonly value: string;

  /**
   * Constructor
   * Si la contraseña no cumple requisitos, lanza ValidationError
   */
  constructor(password: string) {
    if (!this.isValid(password)) {
      throw new ValidationError(
        'Password must be at least 8 characters, with uppercase, lowercase, number and special character',
      );
    }
    this.value = password;
  }

  /**
   * Valida que la contraseña cumpla políticas de seguridad
   * Regex:
   * - (?=.*[a-z]) = Al menos 1 minúscula
   * - (?=.*[A-Z]) = Al menos 1 mayúscula
   * - (?=.*\d) = Al menos 1 número
   * - (?=.*[@$!%*?&]) = Al menos 1 carácter especial
   * - [A-Za-z\d@$!%*?&]{8,} = 8+ caracteres válidos
   */
  private isValid(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * Retorna el valor de la contraseña (en texto plano)
   * Se usará en los Use Cases para comparar con el hash
   */
  getValue(): string {
    return this.value;
  }
}