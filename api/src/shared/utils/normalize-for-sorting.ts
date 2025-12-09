/**
 * Utility functions for normalizing strings for alphabetical sorting
 * Used to generate orderAlbumName, orderArtistName, etc.
 */

/**
 * Normalizes Unicode punctuation characters to their ASCII equivalents
 * This prevents duplicates caused by visually identical but different Unicode characters
 * Example: "blink‐182" (Unicode hyphen) -> "blink-182" (ASCII hyphen)
 */
export function normalizeUnicodePunctuation(str: string): string {
  return str
    // Normalize different types of hyphens/dashes to ASCII hyphen
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    // Normalize different types of spaces to regular space
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Normalize different types of single quotes/apostrophes
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    // Normalize different types of double quotes
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    // Normalize ellipsis
    .replace(/\u2026/g, '...')
    // Remove zero-width characters that can cause invisible differences
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

/**
 * Removes accents/diacritics from a string
 * Example: "Café" -> "Cafe", "Ñoño" -> "Nono"
 */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Removes common articles from the beginning of a string
 * Supports English and Spanish articles
 * Example: "The Beatles" -> "Beatles", "Los Bunkers" -> "Bunkers"
 */
export function removeLeadingArticles(str: string): string {
  const articles = [
    /^the\s+/i,  // English: The
    /^a\s+/i,    // English: A
    /^an\s+/i,   // English: An
    /^el\s+/i,   // Spanish: El
    /^la\s+/i,   // Spanish: La
    /^los\s+/i,  // Spanish: Los
    /^las\s+/i,  // Spanish: Las
    /^un\s+/i,   // Spanish: Un
    /^una\s+/i,  // Spanish: Una
  ];

  let result = str.trim();
  for (const article of articles) {
    result = result.replace(article, '');
  }

  return result;
}

/**
 * Normalizes a string for alphabetical sorting
 * - Normalizes Unicode punctuation (different hyphens, quotes, etc.)
 * - Removes leading articles (The, A, An, El, La, Los, Las, etc.)
 * - Removes accents/diacritics
 * - Converts to lowercase
 * - Trims whitespace
 *
 * Example:
 * - "The Beatles" -> "beatles"
 * - "Café Tacvba" -> "cafe tacvba"
 * - "Los Bunkers" -> "bunkers"
 * - "Ñoño" -> "nono"
 * - "blink‐182" (Unicode hyphen) -> "blink-182"
 */
export function normalizeForSorting(str: string | null | undefined): string {
  if (!str) return '';

  const normalized = normalizeUnicodePunctuation(str.trim());
  return removeAccents(removeLeadingArticles(normalized)).toLowerCase();
}
