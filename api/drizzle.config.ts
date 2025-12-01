// drizzle.config.ts
// Only load dotenv in development (in production, env vars come from Docker)
try {
  require('dotenv/config');
} catch {
  // dotenv not available in production, that's fine
}
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/infrastructure/database/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
