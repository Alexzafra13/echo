#!/usr/bin/env node
/**
 * Sync Migrations Script
 *
 * This script detects migrations that have been applied to the database
 * but are not tracked in __drizzle_migrations table. This can happen when:
 * - Database was set up with drizzle-kit push instead of migrate
 * - Migrations were applied manually
 * - Migration tracking got out of sync
 *
 * It computes SHA256 hashes of migration SQL files (same as drizzle-kit)
 * and registers any untracked migrations whose objects already exist.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DRIZZLE_DIR = process.env.DRIZZLE_DIR || '/app/drizzle';

async function syncMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Ensure migrations table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL UNIQUE,
        created_at BIGINT NOT NULL
      )
    `);

    // Get all tracked migrations
    const tracked = await pool.query('SELECT hash FROM "__drizzle_migrations"');
    const trackedHashes = new Set(tracked.rows.map(r => r.hash));

    // Read journal
    const journalPath = path.join(DRIZZLE_DIR, 'meta/_journal.json');
    if (!fs.existsSync(journalPath)) {
      console.log('  No migration journal found');
      return;
    }

    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
    let synced = 0;

    for (const entry of journal.entries) {
      const sqlPath = path.join(DRIZZLE_DIR, entry.tag + '.sql');
      if (!fs.existsSync(sqlPath)) {
        console.log(`  ⚠ Migration file not found: ${entry.tag}.sql`);
        continue;
      }

      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      const hash = crypto.createHash('sha256').update(sqlContent).digest('hex');

      // Skip if already tracked
      if (trackedHashes.has(hash)) continue;

      // Check if migration objects exist in database
      const exists = await checkMigrationApplied(pool, sqlContent);

      if (exists) {
        await pool.query(
          'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2) ON CONFLICT (hash) DO NOTHING',
          [hash, entry.when]
        );
        console.log(`  ↳ Synced: ${entry.tag} (${hash.slice(0, 8)}...)`);
        synced++;
      }
    }

    if (synced > 0) {
      console.log(`  ✓ Synced ${synced} untracked migration(s)`);
    }

  } catch (err) {
    console.error('  Sync error:', err.message);
  } finally {
    await pool.end();
  }
}

async function checkMigrationApplied(pool, sqlContent) {
  // Check for CREATE TABLE
  const tableMatch = sqlContent.match(/CREATE TABLE\s+"?(\w+)"?/i);
  if (tableMatch) {
    const result = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
      [tableMatch[1]]
    );
    return result.rows.length > 0;
  }

  // Check for ALTER TABLE ADD COLUMN
  const columnMatch = sqlContent.match(/ALTER TABLE\s+"?(\w+)"?\s+ADD COLUMN\s+"?(\w+)"?/i);
  if (columnMatch) {
    const result = await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2",
      [columnMatch[1], columnMatch[2]]
    );
    return result.rows.length > 0;
  }

  // Check for CREATE INDEX
  const indexMatch = sqlContent.match(/CREATE INDEX\s+"?(\w+)"?/i);
  if (indexMatch) {
    const result = await pool.query(
      "SELECT 1 FROM pg_indexes WHERE indexname = $1",
      [indexMatch[1]]
    );
    return result.rows.length > 0;
  }

  // If we can't determine, assume not applied
  return false;
}

// Run
syncMigrations().catch(console.error);
