/**
 * Safe LocalStorage Utility
 *
 * Provides safe access to localStorage with error handling.
 * Prevents crashes in:
 * - Private/Incognito mode (where localStorage may be disabled)
 * - When storage quota is exceeded
 * - When localStorage is blocked by browser settings
 *
 * @module safeLocalStorage
 */

/**
 * Safely get an item from localStorage
 *
 * @param key - The storage key
 * @returns The stored value or null if not found or on error
 */
export function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[SafeLocalStorage] getItem failed:', error);
    }
    return null;
  }
}

/**
 * Safely set an item in localStorage
 *
 * @param key - The storage key
 * @param value - The value to store
 * @returns true if successful, false otherwise
 */
export function setItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[SafeLocalStorage] setItem failed:', error);
    }
    return false;
  }
}

/**
 * Safely remove an item from localStorage
 *
 * @param key - The storage key
 * @returns true if successful, false otherwise
 */
export function removeItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[SafeLocalStorage] removeItem failed:', error);
    }
    return false;
  }
}

/**
 * Safely clear all items from localStorage
 *
 * @returns true if successful, false otherwise
 */
export function clear(): boolean {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[SafeLocalStorage] clear failed:', error);
    }
    return false;
  }
}

/**
 * Check if localStorage is available and working
 *
 * @returns true if localStorage is available, false otherwise
 */
export function isAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe localStorage object with all methods
 */
export const safeLocalStorage = {
  getItem,
  setItem,
  removeItem,
  clear,
  isAvailable,
};
