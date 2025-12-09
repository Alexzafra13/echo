// drizzle.config.js - JavaScript version for production runtime
// TypeScript config doesn't work in production without tsx/ts-node

// Only load dotenv in development
try {
  require('dotenv/config');
} catch {
  // dotenv not available in production, that's fine
}

/** @type {import('drizzle-kit').Config} */
module.exports = {
  out: './drizzle',
  schema: './src/infrastructure/database/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
};
