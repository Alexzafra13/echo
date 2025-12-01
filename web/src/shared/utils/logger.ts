/**
 * Professional logging utility using loglevel
 * Automatically configured based on environment
 */

import log from 'loglevel';

// Configure log level based on environment
if (import.meta.env.DEV) {
  // Development: show all logs (trace, debug, info, warn, error)
  log.setLevel('debug');
} else {
  // Production: only show warnings and errors
  log.setLevel('warn');
}

// Enable this to see trace-level logs in development
// log.setLevel('trace');

/**
 * Logger instance with appropriate level configuration
 *
 * Usage:
 * - logger.trace('very detailed') - only in development with trace enabled
 * - logger.debug('debug info') - only in development
 * - logger.info('general info') - only in development
 * - logger.warn('warning') - always shown
 * - logger.error('error') - always shown
 *
 * In production, you can temporarily enable debug logs via browser console:
 * > log.setLevel('debug')
 */
export const logger = log;
