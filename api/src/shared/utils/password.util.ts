import { randomBytes } from 'crypto';

export class PasswordUtil {
  // Genera contraseña temporal de 8 caracteres (ej: "X7h4Km2p")
  static generateTemporaryPassword(): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';

    const allChars = uppercase + lowercase + numbers;
    const randomBytesBuffer = randomBytes(8);

    let password = '';
    password += uppercase.charAt(randomBytesBuffer[0] % uppercase.length);
    password += lowercase.charAt(randomBytesBuffer[1] % lowercase.length);
    password += numbers.charAt(randomBytesBuffer[2] % numbers.length);

    for (let i = 3; i < 8; i++) {
      password += allChars.charAt(randomBytesBuffer[i] % allChars.length);
    }

    // Fisher-Yates shuffle
    const shuffleBytes = randomBytes(8);
    const chars = password.split('');
    for (let i = chars.length - 1; i > 0; i--) {
      const j = shuffleBytes[i] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }
}
