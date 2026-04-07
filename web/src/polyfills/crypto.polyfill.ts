/**
 * Polyfill for crypto.randomUUID()
 *
 * crypto.randomUUID() is only available in secure contexts (HTTPS or localhost).
 * This polyfill provides a fallback implementation for HTTP contexts.
 */

if (typeof window !== 'undefined' && window.crypto && !window.crypto.randomUUID) {
  // Polyfill randomUUID for non-secure contexts (HTTP)
  window.crypto.randomUUID = function randomUUID() {
    // Generate a RFC4122 version 4 UUID
    // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where x is any hexadecimal digit and y is one of 8, 9, A, or B

    // Use crypto.getRandomValues if available (works in HTTP contexts)
    if (window.crypto && window.crypto.getRandomValues) {
      const buffer = new Uint8Array(16);
      window.crypto.getRandomValues(buffer);

      // Set version (4) and variant bits
      buffer[6] = (buffer[6] & 0x0f) | 0x40; // Version 4
      buffer[8] = (buffer[8] & 0x3f) | 0x80; // Variant 10

      // Convert to hex string with dashes
      const hex = Array.from(buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32)
      ].join('-') as `${string}-${string}-${string}-${string}-${string}`;
    }

    // Fallback to Math.random() if crypto.getRandomValues is not available
    // This is less secure but ensures compatibility
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }) as `${string}-${string}-${string}-${string}-${string}`;
  };
}

export {};
