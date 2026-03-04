import { randomBytes } from 'crypto';

const PASSWORD_LENGTH = 16;

export class PasswordUtil {
  // Generates a temporary password (e.g. "X7h$Km2p!nR4qW5z")
  // Includes uppercase, lowercase, numbers and special characters for strength.
  // Avoids visually ambiguous characters (I, O, l, 0, 1).
  static generateTemporaryPassword(): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const special = '!@#$%&*?';

    const allChars = uppercase + lowercase + numbers + special;
    const randomBytesBuffer = randomBytes(PASSWORD_LENGTH);

    // Guarantee at least one char from each category
    let password = '';
    password += uppercase.charAt(randomBytesBuffer[0] % uppercase.length);
    password += lowercase.charAt(randomBytesBuffer[1] % lowercase.length);
    password += numbers.charAt(randomBytesBuffer[2] % numbers.length);
    password += special.charAt(randomBytesBuffer[3] % special.length);

    for (let i = 4; i < PASSWORD_LENGTH; i++) {
      password += allChars.charAt(randomBytesBuffer[i] % allChars.length);
    }

    // Fisher-Yates shuffle
    const shuffleBytes = randomBytes(PASSWORD_LENGTH);
    const chars = password.split('');
    for (let i = chars.length - 1; i > 0; i--) {
      const j = shuffleBytes[i] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }
}
