/**
 * PasswordUtil - Utilidades para manejo de contraseñas
 */
export class PasswordUtil {
  /**
   * Genera una contraseña temporal alfanumérica de 8 caracteres
   * Incluye letras mayúsculas, minúsculas y números para mayor seguridad
   * Ejemplo: "X7h4Km2p"
   */
  static generateTemporaryPassword(): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sin I, O para evitar confusión
    const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // Sin i, l, o para evitar confusión
    const numbers = '23456789'; // Sin 0, 1 para evitar confusión con O, I

    const allChars = uppercase + lowercase + numbers;
    let password = '';

    // Asegurar al menos 1 mayúscula, 1 minúscula, 1 número
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));

    // Rellenar hasta 8 caracteres con caracteres aleatorios
    for (let i = 3; i < 8; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Mezclar los caracteres para que no sea predecible
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
}