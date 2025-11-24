import { randomUUID } from 'crypto';

/**
 * Genera un UUID v4 usando el generador nativo de Node.js
 * 
 * @returns UUID v4 string
 * @example
 * const id = generateUuid(); // "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateUuid(): string {
  return randomUUID();
}