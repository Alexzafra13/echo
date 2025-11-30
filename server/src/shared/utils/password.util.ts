import { randomBytes } from 'crypto';

/**
 * PasswordUtil - Utilidades para manejo de contraseñas
 */
export class PasswordUtil {
  /**
   * Genera una contraseña temporal alfanumérica de 8 caracteres
   * Incluye letras mayúsculas, minúsculas y números para mayor seguridad
   * Usa crypto.randomBytes para generación criptográficamente segura
   * Ejemplo: "X7h4Km2p"
   */
  static generateTemporaryPassword(): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sin I, O para evitar confusión
    const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // Sin i, l, o para evitar confusión
    const numbers = '23456789'; // Sin 0, 1 para evitar confusión con O, I

    const allChars = uppercase + lowercase + numbers;

    // Generar bytes aleatorios criptográficamente seguros
    const randomBytesBuffer = randomBytes(8);

    // Asegurar al menos 1 mayúscula, 1 minúscula, 1 número
    let password = '';
    password += uppercase.charAt(randomBytesBuffer[0] % uppercase.length);
    password += lowercase.charAt(randomBytesBuffer[1] % lowercase.length);
    password += numbers.charAt(randomBytesBuffer[2] % numbers.length);

    // Rellenar hasta 8 caracteres con caracteres aleatorios
    for (let i = 3; i < 8; i++) {
      password += allChars.charAt(randomBytesBuffer[i] % allChars.length);
    }

    // Mezclar los caracteres usando Fisher-Yates shuffle con crypto
    const shuffleBytes = randomBytes(8);
    const chars = password.split('');
    for (let i = chars.length - 1; i > 0; i--) {
      const j = shuffleBytes[i] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }
}
