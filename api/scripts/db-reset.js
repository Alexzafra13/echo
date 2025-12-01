// scripts/db-reset.js
// Resets the database by dropping all tables and re-applying migrations
// Usage: node scripts/db-reset.js

// Load environment variables from .env file
require('dotenv').config();

const { Pool } = require('pg');
const { spawn } = require('child_process');
const path = require('path');

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('');
  console.log('===========================================');
  console.log('       DATABASE RESET - Echo Server');
  console.log('===========================================');
  console.log('');
  console.log('WARNING: This will delete ALL data in the database!');
  console.log('');

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Step 1: Drop all tables by dropping and recreating the public schema
    console.log('[1/2] Dropping all tables...');

    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await pool.query('GRANT ALL ON SCHEMA public TO public');

    console.log('      All tables dropped successfully');

    // Close the pool before running drizzle-kit
    await pool.end();

    // Step 2: Apply migrations
    console.log('[2/2] Applying database migrations...');

    await new Promise((resolve, reject) => {
      const drizzle = spawn('npx', ['drizzle-kit', 'migrate'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        shell: true,
        env: { ...process.env }
      });

      drizzle.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`drizzle-kit migrate failed with code ${code}`));
        }
      });

      drizzle.on('error', reject);
    });

    console.log('');
    console.log('===========================================');
    console.log('      Database reset completed!');
    console.log('===========================================');
    console.log('');
    console.log('Next: Start the server and complete the setup wizard');
    console.log('      to create your admin account.');
    console.log('');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
