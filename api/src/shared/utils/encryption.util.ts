import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT = 'echo-federation-token-encryption'; // Static — security comes from the secret

/**
 * Derives an AES-256 key from a master secret.
 * Uses scrypt with a fixed salt (the secret provides the real entropy).
 */
function deriveKey(masterSecret: string): Buffer {
  return scryptSync(masterSecret, SALT, KEY_LENGTH);
}

/**
 * Encrypts a plaintext string with AES-256-GCM.
 * Returns: iv(hex):authTag(hex):ciphertext(hex)
 */
export function encryptString(plaintext: string, masterSecret: string): string {
  const key = deriveKey(masterSecret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string encrypted with encryptString.
 * Returns null if the format is invalid or decryption fails.
 */
export function decryptString(encryptedData: string, masterSecret: string): string | null {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return null;

    const [ivHex, authTagHex, ciphertext] = parts;
    const key = deriveKey(masterSecret);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    return null;
  }
}

/**
 * Detects if a string is encrypted (format iv:authTag:ciphertext).
 * Useful for gradual migration of existing plaintext tokens.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  // Each part must be valid hex with expected lengths
  return parts[0].length === IV_LENGTH * 2 && parts[1].length === AUTH_TAG_LENGTH * 2;
}
