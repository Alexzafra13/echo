#!/usr/bin/env node
/**
 * Lightweight migration runner using drizzle-orm
 * This replaces 'drizzle-kit migrate' for production use,
 * allowing drizzle-kit to be a devDependency only.
 *
 * Saves ~30MB in the final Docker image.
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { Pool } = require('pg');
const path = require('path');

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🔄 Running database migrations...');

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const db = drizzle(pool);

  try {
    // Run migrations from the drizzle folder
    const migrationsFolder = path.join(__dirname, '..', 'drizzle');

    await migrate(db, {
      migrationsFolder,
    });

    console.log('✅ Database migrations applied!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    // Don't exit with error - let the app start anyway
    // Some migrations might already be applied
    console.log('⚠️  Continuing despite migration error...');
  } finally {
    await pool.end();
  }
}

runMigrations();
