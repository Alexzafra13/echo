/**
 * Utility functions for normalizing strings for alphabetical sorting
 * Used to generate orderAlbumName, orderArtistName, etc.
 */

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
 */
export function normalizeForSorting(str: string | null | undefined): string {
  if (!str) return '';

  return removeAccents(removeLeadingArticles(str.trim())).toLowerCase();
}
