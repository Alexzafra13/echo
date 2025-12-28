/**
 * Database configuration with sensible defaults for self-hosted use.
 */
export const databaseConfig = {
  database_url: process.env.DATABASE_URL,

  // Connection pool - prevents exhausting DB connections
  pool: {
    max: 20,                      // Max connections (enough for most use cases)
    min: 2,                       // Keep 2 warm connections
    idleTimeoutMillis: 30000,     // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail fast if DB is unreachable
    statementTimeout: 60000,      // Kill queries running > 60s
  },
};
