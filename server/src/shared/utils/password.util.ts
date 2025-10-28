/**
 * PasswordUtil - Utilidades para manejo de contraseñas
 */
export class PasswordUtil {
  /**
   * Genera una contraseña temporal de 6 dígitos
   * Ejemplo: "482719"
   */
  static generateTemporaryPassword(): string {
    const min = 100000;
    const max = 999999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }
}