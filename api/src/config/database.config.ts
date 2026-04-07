import * as os from 'os';

/**
 * Auto-sizes the database connection pool based on available system memory.
 * Plug and play — no environment variables needed.
 *
 * Each PostgreSQL connection consumes ~5-10MB of RAM.
 * We reserve at least 512MB for the rest of the application.
 *
 * Results by RAM:
 *   512MB → max: 3, min: 1
 *   1GB   → max: 4, min: 1
 *   2GB   → max: 12, min: 3
 *   4GB+  → max: 20, min: 3
 */
function getOptimalPoolSize(): { max: number; min: number } {
  const totalMemoryGB = os.totalmem() / 1024 / 1024 / 1024;
  const availableForPool = Math.max(totalMemoryGB - 0.5, 0.5);
  const max = Math.min(Math.max(Math.floor(availableForPool * 8), 3), 20);
  const min = Math.min(Math.max(Math.floor(max / 4), 1), 3);

  return { max, min };
}

const poolSize = getOptimalPoolSize();

export const databaseConfig = {
  database_url: process.env.DATABASE_URL,

  pool: {
    max: poolSize.max,
    min: poolSize.min,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statementTimeout: 60000,
  },
};
