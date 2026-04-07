import { createSafeStorage } from './createSafeStorage';

export const safeLocalStorage = createSafeStorage(() => localStorage, 'SafeLocalStorage');
