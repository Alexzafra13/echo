import { createSafeStorage } from './createSafeStorage';

export const safeSessionStorage = createSafeStorage(() => sessionStorage, 'SafeSessionStorage');
