#!/usr/bin/env node
/**
 * Script to sync shared types for EAS Build
 *
 * This copies types from @echo/shared to mobile/src/types
 * because EAS Build has issues with pnpm workspace dependencies.
 *
 * Run before EAS build: node scripts/sync-shared-types.js
 */

const fs = require('fs');
const path = require('path');

const SHARED_TYPES_DIR = path.join(__dirname, '../../packages/shared/src/types');
const LOCAL_TYPES_DIR = path.join(__dirname, '../src/types');

// Ensure local types directory exists
if (!fs.existsSync(LOCAL_TYPES_DIR)) {
  fs.mkdirSync(LOCAL_TYPES_DIR, { recursive: true });
}

// Copy all .ts files from shared types
const files = fs.readdirSync(SHARED_TYPES_DIR);

files.forEach(file => {
  if (file.endsWith('.ts')) {
    const src = path.join(SHARED_TYPES_DIR, file);
    const dest = path.join(LOCAL_TYPES_DIR, file);
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${file}`);
  }
});

console.log('✅ Shared types synced successfully');
