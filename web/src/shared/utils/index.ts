/**
 * Re-export shared utils from @echo/shared
 * for backward compatibility
 */
export * from '@echo/shared/utils';

/**
 * Web-specific utils (use browser APIs)
 */
export * from './avatar.utils';
export * from './colorExtractor';
export * from './cover.utils';
export * from './safeLocalStorage';
