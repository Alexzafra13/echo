/**
 * Wrapper seguro para Storage APIs.
 * Evita crashes en modo privado, cuota excedida o storage bloqueado.
 */

export interface SafeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): boolean;
  removeItem(key: string): boolean;
  clear(): boolean;
  isAvailable(): boolean;
}

export function createSafeStorage(storage: () => Storage, label: string): SafeStorage {
  function getItem(key: string): string | null {
    try {
      return storage().getItem(key);
    } catch (error) {
      if (import.meta.env.DEV) console.error(`[${label}] getItem failed:`, error);
      return null;
    }
  }

  function setItem(key: string, value: string): boolean {
    try {
      storage().setItem(key, value);
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error(`[${label}] setItem failed:`, error);
      return false;
    }
  }

  function removeItem(key: string): boolean {
    try {
      storage().removeItem(key);
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error(`[${label}] removeItem failed:`, error);
      return false;
    }
  }

  function clear(): boolean {
    try {
      storage().clear();
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error(`[${label}] clear failed:`, error);
      return false;
    }
  }

  function isAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      storage().setItem(testKey, 'test');
      storage().removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  return { getItem, setItem, removeItem, clear, isAvailable };
}
