/**
 * Escapes special LIKE/ILIKE wildcard characters in a search query.
 * This prevents users from injecting wildcards like % or _ into searches.
 *
 * @param query - The raw search query from user input
 * @returns The escaped query safe for use in LIKE/ILIKE patterns
 *
 * @example
 * escapeLikeWildcards("50%") // returns "50\%"
 * escapeLikeWildcards("_test") // returns "\_test"
 * escapeLikeWildcards("normal") // returns "normal"
 */
export function escapeLikeWildcards(query: string): string {
  // Escape backslash first, then % and _
  return query.replace(/[\\%_]/g, '\\$&');
}

/**
 * Creates a search pattern for ILIKE with proper escaping.
 * Wraps the escaped query with % wildcards for substring matching.
 *
 * @param query - The raw search query from user input
 * @returns The escaped pattern ready for ILIKE (e.g., "%escaped_query%")
 *
 * @example
 * createSearchPattern("rock") // returns "%rock%"
 * createSearchPattern("50%") // returns "%50\%%"
 */
export function createSearchPattern(query: string): string {
  return `%${escapeLikeWildcards(query)}%`;
}
