import { removeAccents, normalizeUnicodePunctuation } from './normalize-for-sorting';

/**
 * Convierte un string a slug URL-friendly determinista.
 * Minúsculas, sin acentos, espacios y puntuación a guiones, un único guion consecutivo.
 *
 * Ejemplos:
 * - "Hip-Hop" -> "hip-hop"
 * - "Rock Alternativo" -> "rock-alternativo"
 * - "R&B / Soul" -> "r-and-b-soul"
 * - "Café" -> "cafe"
 */
export function slugify(value: string): string {
  if (!value) return '';

  return removeAccents(normalizeUnicodePunctuation(value))
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}
