export const databaseConfig = {
  database_url: process.env.DATABASE_URL,

  pool: {
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statementTimeout: 60000,
  },
};
