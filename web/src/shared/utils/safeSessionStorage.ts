/**
 * Safe SessionStorage Utility
 *
 * Provides safe access to sessionStorage with error handling.
 * Prevents crashes in:
 * - Private/Incognito mode (where sessionStorage may be disabled)
 * - When storage quota is exceeded
 * - When sessionStorage is blocked by browser settings
 *
 * @module safeSessionStorage
 */

/**
 * Safely get an item from sessionStorage
 *
 * @param key - The storage key
 * @returns The stored value or null if not found or on error
 */
export function getItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[SafeSessionStorage] getItem failed:', error);
    }
    return null;
  }
}

/**
 * Safely set an item in sessionStorage
 *
 * @param key - The storage key
 * @param value - The value to store
 * @returns true if successful, false otherwise
 */
export function setItem(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[SafeSessionStorage] setItem failed:', error);
    }
    return false;
  }
}

/**
 * Safely remove an item from sessionStorage
 *
 * @param key - The storage key
 * @returns true if successful, false otherwise
 */
export function removeItem(key: string): boolean {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[SafeSessionStorage] removeItem failed:', error);
    }
    return false;
  }
}

/**
 * Safely clear all items from sessionStorage
 *
 * @returns true if successful, false otherwise
 */
export function clear(): boolean {
  try {
    sessionStorage.clear();
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[SafeSessionStorage] clear failed:', error);
    }
    return false;
  }
}

/**
 * Check if sessionStorage is available and working
 *
 * @returns true if sessionStorage is available, false otherwise
 */
export function isAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe sessionStorage object with all methods
 */
export const safeSessionStorage = {
  getItem,
  setItem,
  removeItem,
  clear,
  isAvailable,
};
