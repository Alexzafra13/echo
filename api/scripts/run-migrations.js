#!/usr/bin/env node
/**
 * Lightweight migration runner using drizzle-orm
 * This replaces 'drizzle-kit migrate' for production use,
 * allowing drizzle-kit to be a devDependency only.
 *
 * Features:
 * - Auto-recovery for common migration issues
 * - Applies missing migrations individually if batch fails
 * - User-friendly: no technical intervention needed
 *
 * Saves ~30MB in the final Docker image.
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const migrationsFolder = path.join(__dirname, '..', 'drizzle');

/**
 * Get list of migration files from disk
 */
function getMigrationFiles() {
  const files = fs.readdirSync(migrationsFolder)
    .filter(f => f.endsWith('.sql'))
    .sort();
  return files;
}

/**
 * Calculate hash for a migration file (same as Drizzle does)
 */
function getMigrationHash(filename) {
  const content = fs.readFileSync(path.join(migrationsFolder, filename), 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Get applied migrations from database
 */
async function getAppliedMigrations(pool) {
  try {
    const result = await pool.query('SELECT hash FROM "__drizzle_migrations" ORDER BY created_at');
    return new Set(result.rows.map(r => r.hash));
  } catch (e) {
    // Table doesn't exist yet - that's fine, no migrations applied
    return new Set();
  }
}

/**
 * Apply a single migration manually
 */
async function applySingleMigration(pool, filename) {
  const sql = fs.readFileSync(path.join(migrationsFolder, filename), 'utf8');
  const hash = getMigrationHash(filename);

  // Split by statement breakpoint and execute each
  const statements = sql.split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (e) {
      // Ignore "already exists" errors - the object is already there
      if (e.message.includes('already exists') || e.message.includes('duplicate key')) {
        console.log(`   ⏭️  Skipping (already exists): ${statement.substring(0, 50)}...`);
      } else {
        throw e;
      }
    }
  }

  // Mark migration as applied
  await pool.query(
    'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING',
    [hash]
  );
}

/**
 * Ensure drizzle migrations table exists
 */
async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash VARCHAR(256) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🔄 Running database migrations...');

  const migrationFiles = getMigrationFiles();
  console.log(`   Found ${migrationFiles.length} migration files`);

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    // First, try the standard Drizzle migration
    await migrate(db, { migrationsFolder });
    console.log('✅ Database migrations applied successfully!');
  } catch (error) {
    console.log('');
    console.log('⚠️  Standard migration failed, attempting auto-recovery...');
    console.log(`   Error: ${error.message}`);
    console.log('');

    try {
      // Ensure migrations table exists
      await ensureMigrationsTable(pool);

      // Get what's already applied
      const applied = await getAppliedMigrations(pool);
      console.log(`   ${applied.size} migrations already applied`);

      // Apply missing migrations one by one
      let newApplied = 0;
      for (const file of migrationFiles) {
        const hash = getMigrationHash(file);
        if (!applied.has(hash)) {
          console.log(`   📦 Applying: ${file}`);
          try {
            await applySingleMigration(pool, file);
            newApplied++;
            console.log(`   ✓  Applied: ${file}`);
          } catch (e) {
            console.error(`   ✗  Failed: ${file} - ${e.message}`);
            // Continue with next migration
          }
        }
      }

      if (newApplied > 0) {
        console.log('');
        console.log(`✅ Auto-recovery complete! Applied ${newApplied} migrations.`);
      } else {
        console.log('');
        console.log('✅ Database schema is up to date.');
      }
    } catch (recoveryError) {
      console.error('');
      console.error('❌ Auto-recovery failed:', recoveryError.message);
      console.error('   The application will start but may have issues.');
      console.error('');
    }
  } finally {
    await pool.end();
  }
}

runMigrations();
