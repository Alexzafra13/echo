/**
 * Simple logger utility with DEV guards
 * Only logs in development mode
 */

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args); // eslint-disable-line no-console
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args); // eslint-disable-line no-console
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
};
