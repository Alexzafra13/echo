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
const fs = require('fs');

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  const failOnError = process.env.MIGRATIONS_FAIL_ON_ERROR === 'true';

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🔄 Running database migrations...');

  // List available migrations
  const migrationsFolder = path.join(__dirname, '..', 'drizzle');
  try {
    const files = fs.readdirSync(migrationsFolder)
      .filter(f => f.endsWith('.sql'))
      .sort();
    console.log(`   Found ${files.length} migration files`);
  } catch (e) {
    console.error('❌ Could not read migrations folder:', migrationsFolder);
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const db = drizzle(pool);

  try {
    await migrate(db, {
      migrationsFolder,
    });

    console.log('✅ Database migrations applied successfully!');
  } catch (error) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ MIGRATION FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    console.error('Error:', error.message);
    console.error('');

    // Check for common issues
    if (error.message.includes('already exists')) {
      console.error('💡 This usually means the migration was partially applied.');
      console.error('   The column/table exists but wasn\'t tracked in __drizzle_migrations.');
      console.error('');
      console.error('   To fix, connect to PostgreSQL and run:');
      console.error('   INSERT INTO __drizzle_migrations (hash, created_at) VALUES');
      console.error('   (\'<migration_hash>\', NOW());');
    } else if (error.message.includes('does not exist')) {
      console.error('💡 A required column/table is missing.');
      console.error('   Check the migration files in /app/drizzle/');
    }

    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');

    if (failOnError) {
      console.error('⛔ MIGRATIONS_FAIL_ON_ERROR=true - stopping application');
      process.exit(1);
    } else {
      console.warn('⚠️  Continuing despite migration error...');
      console.warn('   Set MIGRATIONS_FAIL_ON_ERROR=true to stop on failure');
      console.warn('');
    }
  } finally {
    await pool.end();
  }
}

runMigrations();
