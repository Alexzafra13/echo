/**
 * Database configuration optimized for production.
 * Pool settings based on PostgreSQL best practices.
 */
export const databaseConfig = {
  database_url: process.env.DATABASE_URL,

  // Connection pool settings
  pool: {
    // Maximum number of clients in the pool
    // Rule of thumb: (CPU cores * 2) + effective_spindle_count
    // For cloud: start with 10-20 and monitor
    max: parseInt(process.env.DB_POOL_MAX ?? '20', 10),

    // Minimum number of idle clients to keep
    min: parseInt(process.env.DB_POOL_MIN ?? '2', 10),

    // How long a client can be idle before being closed (ms)
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT ?? '30000', 10),

    // How long to wait for a connection before timing out (ms)
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT ?? '5000', 10),

    // Maximum time a client can be checked out (ms) - prevents connection leaks
    // 0 = no timeout
    statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT ?? '60000', 10),
  },
};